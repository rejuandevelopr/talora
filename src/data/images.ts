/**
 * Talora uses a desert at dusk theme. All photography is served from the
 * Unsplash CDN with automatic AVIF/WebP, cropping and quality settings, so the
 * browser only downloads the size it needs (see Img.astro srcset).
 *
 * If a photo ever fails to load, the container shows a warm dusk gradient
 * instead of a broken image. To use your own photos, drop them in src/assets
 * and swap <Img> for Astro's <Image /> from "astro:assets".
 */
export const photos = {
  heroDunes: 'photo-1509316785289-025f5b846b35', // sand dunes at golden hour
  desertRoad: 'photo-1473580044384-7ba9967e16a0', // open desert
  canyonRoad: 'photo-1469854523086-cc02fe5d8800', // road through red rock
  valley: 'photo-1500530855697-b586d89ba3ee', // warm valley landscape
  milkyWay: 'photo-1506318137071-a8e063b4bec0', // milky way
} as const;

export const people = {
  amara: 'photo-1531123897727-8f129e1688ce',
  jonas: 'photo-1500648767791-00dcc994a43e',
  priya: 'photo-1544005313-94ddf0286df2',
  tom: 'photo-1507003211169-0a1dd7228f2d',
  elena: 'photo-1517841905240-472988babdf9',
  noah: 'photo-1539571696357-5a69c17a67c6',
  maya: 'photo-1580489944761-15a19d654956',
  leo: 'photo-1527980965255-d3b416303d12',
  sara: 'photo-1494790108377-be9c29b29330',
  felix: 'photo-1472099645785-5658abf4ff4e',
} as const;

export const unsplash = (id: string, w: number, q = 70, h?: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ''}&q=${q}`;

export const srcset = (id: string, widths: number[], q = 70) =>
  widths.map((w) => `${unsplash(id, w, q)} ${w}w`).join(', ');

export const avatar = (id: string, size = 96) => unsplash(id, size, 75, size) + '&crop=faces';
