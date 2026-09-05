export interface CustomerDocument {
  _id: unknown;
  id?: string;
  name: string;
  document: string;
  type?: string;
  email?: string;
  phone?: string;
  areaCode?: string;
  countryCode?: string;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CustomerAuthResult {
  id: string;
  name: string;
  document: string;
  email?: string;
  active: boolean;
}
