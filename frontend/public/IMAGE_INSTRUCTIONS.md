# Image Upload Instructions

## Gavel Image Update

To update the gavel image with the dramatic courtroom version:

1. Upload your new gavel image file to this `/public` folder
2. Name it `gavel-dramatic.png` 
3. Update the Hero.tsx component to use the new image:

```typescript
// In src/components/sections/Hero.tsx, change:
<img src="/gavel.png" alt="Legal gavel" />
// to:
<img src="/gavel-dramatic.png" alt="Dramatic courtroom gavel" />
```

The current gavel.png is a placeholder - replace it with your dramatic courtroom gavel image for better visual impact.

## Image Requirements
- Format: PNG (preferred) or JPG
- Size: Recommended 400x400px or larger
- Background: Transparent (for PNG) or clean background
- Style: Professional, dramatic courtroom setting

## Current Images
- `gavel.png` - Current placeholder gavel image
- `logo.svg` - Legal AI logo (used for avatars after removing human photos)