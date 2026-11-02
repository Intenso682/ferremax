import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'ferremax-super-secret-key-2026',
  bcvDefaultRate: Number(process.env.BCV_DEFAULT_RATE || 889.50),
  storeName: process.env.STORE_NAME || 'FerreMax Venezuela',
  storeRif: process.env.STORE_RIF || 'J-50123456-7',
  storeAddress: process.env.STORE_ADDRESS || 'Av. Francisco de Miranda, Caracas',
  storePhone: process.env.STORE_PHONE || '0212-9876543 / 0414-2345678',
  ivaPercent: Number(process.env.IVA_PERCENT || 16),
  igtfPercent: Number(process.env.IGTF_PERCENT || 3),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
};
