import { useEffect, useRef, useState } from 'react';
import { meetingSignal } from './api';

/**
 * One-to-one WebRTC call for a meeting. Audio/video flow directly between the two browsers; the
 * backend WebSocket only relays the offer/answer, ICE candidates and mic/camera state.
 *
 * Whoever is already in the room when the other side arrives sends the offer, so two peers never
 * offer at the same time. If either side drops, the other goes back to "waiting" and the call is
 * re-negotiated from scratch when they return.
 */
export type CallStatus =
  | 'connecting' // opening the signalling channel
  | 'waiting' // in the room, the other side isn't here yet
  | 'negotiating' // other side is here, media is being connected
  | 'connected' // media flowing
  | 'reconnecting' // signalling dropped, retrying
  | 'ended' // host ended the meeting
  | 'error'; // can't join (not a participant, expired session…)

export interface CallPeer {
  name: string;
  role: 'host' | 'participant';
}

interface Options {
  code: string;
  enabled: boolean;
  localStream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
}

const DEFAULT_ICE: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302'] }];

export function useMeetingCall({ code, enabled, localStream, micOn, camOn }: Options) {
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteMic, setRemoteMic] = useState(true);
  const [remoteCam, setRemoteCam] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const localRef = useRef<MediaStream | null>(localStream);
  const mediaState = useRef({ micOn, camOn });
  localRef.current = localStream;
  mediaState.current = { micOn, camOn };

  // Tell the other side when mic/camera is toggled.
  useEffect(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'state', micOn, camOn }));
  }, [micOn, camOn]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let finished = false; // ended / fatal error: don't reconnect
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let pc: RTCPeerConnection | null = null;
    let isOfferer = false;
    let iceServers: RTCIceServer[] = DEFAULT_ICE;
    let pendingIce: RTCIceCandidateInit[] = [];

    const send = (msg: object) => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    };
    const sendState = () => send({ type: 'state', ...mediaState.current });

    const closePc = () => {
      if (pc) {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.close();
      }
      pc = null;
      pendingIce = [];
      setRemoteStream(null);
    };

    const newPc = () => {
      closePc();
      const conn = new RTCPeerConnection({ iceServers });
      const remote = new MediaStream();
      conn.ontrack = (e) => {
        if (!remote.getTracks().includes(e.track)) remote.addTrack(e.track);
        setRemoteStream(new MediaStream(remote.getTracks()));
      };
      conn.onicecandidate = (e) => {
        if (e.candidate) send({ type: 'ice', candidate: e.candidate.toJSON() });
      };
      conn.onconnectionstatechange = () => {
        if (conn !== pc) return;
        const s = conn.connectionState;
        if (s === 'connected') setStatus('connected');
        else if (s === 'disconnected' || s === 'connecting') setStatus('negotiating');
        else if (s === 'failed') {
          setStatus('negotiating');
          if (isOfferer) void makeOffer(true); // ICE restart
        }
      };
      pc = conn;
      return conn;
    };

    const addLocalTracks = (conn: RTCPeerConnection) => {
      const stream = localRef.current;
      const kinds = new Set<string>();
      stream?.getTracks().forEach((t) => {
        conn.addTrack(t, stream);
        kinds.add(t.kind);
      });
      return kinds;
    };

    const flushIce = async () => {
      if (!pc?.remoteDescription) return;
      const queued = pendingIce;
      pendingIce = [];
      for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
    };

    async function makeOffer(iceRestart = false) {
      isOfferer = true;
      let conn = pc;
      if (!conn || !iceRestart) {
        conn = newPc();
        const kinds = addLocalTracks(conn);
        // Still receive the other side's media if we have no camera/mic of our own.
        for (const kind of ['audio', 'video'] as const)
          if (!kinds.has(kind)) conn.addTransceiver(kind, { direction: 'recvonly' });
      }
      try {
        const offer = await conn.createOffer({ iceRestart });
        if (conn !== pc) return;
        await conn.setLocalDescription(offer);
        send({ type: 'offer', sdp: conn.localDescription });
      } catch {
        /* superseded by a newer negotiation */
      }
    }

    const handleOffer = async (sdp: RTCSessionDescriptionInit) => {
      isOfferer = false;
      // An ICE-restart offer arrives on an existing connection; anything else starts fresh.
      const conn = pc && pc.signalingState === 'stable' && pc.remoteDescription ? pc : newPc();
      try {
        const fresh = !conn.remoteDescription;
        await conn.setRemoteDescription(sdp);
        if (fresh) addLocalTracks(conn);
        const answer = await conn.createAnswer();
        if (conn !== pc) return;
        await conn.setLocalDescription(answer);
        send({ type: 'answer', sdp: conn.localDescription });
        await flushIce();
      } catch {
        /* superseded */
      }
    };

    const connect = () => {
      if (disposed) return;
      const { url, token } = meetingSignal(code);
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }));
      ws.onmessage = async (ev) => {
        let msg: any;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        switch (msg.type) {
          case 'joined':
            retry = 0;
            if (Array.isArray(msg.iceServers) && msg.iceServers.length) iceServers = msg.iceServers;
            if (msg.peer) {
              setPeer(msg.peer);
              setStatus('negotiating'); // the peer already here will send us an offer
              sendState();
            } else {
              setPeer(null);
              setStatus('waiting');
            }
            break;
          case 'peer-joined':
            setPeer(msg.peer);
            setRemoteMic(true);
            setRemoteCam(true);
            setStatus('negotiating');
            sendState();
            await makeOffer();
            break;
          case 'offer':
            await handleOffer(msg.sdp);
            break;
          case 'answer':
            if (pc && pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(msg.sdp).catch(() => {});
              await flushIce();
            }
            break;
          case 'ice':
            if (pc?.remoteDescription) await pc.addIceCandidate(msg.candidate).catch(() => {});
            else pendingIce.push(msg.candidate);
            break;
          case 'state':
            setRemoteMic(msg.micOn !== false);
            setRemoteCam(msg.camOn !== false);
            break;
          case 'peer-left':
            closePc();
            setPeer(null);
            setStatus('waiting');
            break;
          case 'ended':
            finished = true;
            closePc();
            setStatus('ended');
            break;
          case 'error':
            finished = true;
            closePc();
            setError(msg.message || 'Could not join the meeting.');
            setStatus('error');
            break;
        }
      };
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        if (disposed || finished) return;
        // Signalling dropped (network blip, server restart): media may still flow; reconnect.
        setStatus((s) => (s === 'connected' ? s : 'reconnecting'));
        retryTimer = setTimeout(connect, Math.min(1000 * 2 ** retry++, 10000));
      };
    };

    setStatus('connecting');
    setError(null);
    connect();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
      closePc();
    };
  }, [code, enabled]);

  return { status, error, peer, remoteStream, remoteMic, remoteCam };
}
