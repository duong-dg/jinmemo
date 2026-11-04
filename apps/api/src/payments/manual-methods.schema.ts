import{z}from'zod';
export const manualMethodId=z.string().regex(/^(?:CASH|PAY_LATER|MANUAL_[a-zA-Z0-9_-]{1,60})$/);
