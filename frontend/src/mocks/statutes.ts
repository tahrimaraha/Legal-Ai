import type { Statute } from './types';

type StatuteSummary = Pick<Statute, 'id' | 'titleBn' | 'titleEn' | 'year'> & { chunks: number };

export const statutes: StatuteSummary[] = [
  { id: 'constitution', titleBn: 'বাংলাদেশের সংবিধান', titleEn: 'Constitution of Bangladesh', year: '1972', chunks: 412 },
  { id: 'penal', titleBn: 'দণ্ডবিধি', titleEn: 'Penal Code', year: '1860', chunks: 968 },
  { id: 'mfla', titleBn: 'মুসলিম পারিবারিক আইন অধ্যাদেশ', titleEn: 'Muslim Family Laws Ordinance', year: '1961', chunks: 74 },
  { id: 'family-courts', titleBn: 'পারিবারিক আদালত অধ্যাদেশ', titleEn: 'Family Courts Ordinance', year: '1985', chunks: 96 },
  { id: 'rent', titleBn: 'বাড়ী ভাড়া নিয়ন্ত্রণ আইন', titleEn: 'House Rent Control Act', year: '1991', chunks: 118 },
  { id: 'evidence', titleBn: 'সাক্ষ্য আইন', titleEn: 'Evidence Act', year: '1872', chunks: 340 },
  { id: 'procedure', titleBn: 'মামলা দায়ের ও আদালতের কার্যপদ্ধতি', titleEn: 'Case filing and court procedure', year: '—', chunks: 152 },
  { id: 'notice-guide', titleBn: 'লিগ্যাল নোটিশ গাইড', titleEn: 'Legal notice guide', year: '—', chunks: 46 },
];

export const statuteById = (id: string) => statutes.find((s) => s.id === id);
