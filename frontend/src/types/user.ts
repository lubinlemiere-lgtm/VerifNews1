// ###########################################################################
// # Types User — Interfaces pour l'authentification
// # User: profil utilisateur. TokenResponse: access + refresh tokens
// ###########################################################################

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  country_code: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
