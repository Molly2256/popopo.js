export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: infer TArgs) => infer TResult
    ? (...args: TArgs) => TResult
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export interface AuthState {
  bearerToken?: string;
  refreshToken?: string;
  firebaseIdToken?: string;
  appCheckToken?: string;
  cookie?: string;
  userId?: string;
  email?: string;
}

export interface FirebaseClientConfig {
  apiKey: string;
  authBaseUrl: string;
  secureTokenBaseUrl: string;
  authDomain: string;
  appId: string;
  projectId: string;
  storageBucket: string;
  webClientId: string;
  returnSecureToken: boolean;
  tenantId?: string;
}

export interface TsoClientConfig {
  oauthBaseUrl: string;
  fileApiBaseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export interface UserProfile {
  id?: string;
  userId?: string;
  email?: string;
  alias?: string;
  displayName?: string;
  anotherName?: string;
  iconSource?: string;
  ownerUserId?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AccountProfilePatch {
  alias?: string;
  displayName?: string;
  anotherName?: string;
  iconSource?: string;
  ownerUserId?: string;
  photoUrl?: string;
  [key: string]: unknown;
}

export interface Space {
  id?: string;
  slug?: string;
  name?: string;
  title?: string;
  description?: string;
  [key: string]: unknown;
}

export interface Invite {
  code?: string;
  id?: string;
  inviterId?: string;
  spaceId?: string;
  status?: string;
  [key: string]: unknown;
}

export interface NotificationItem {
  id?: string;
  type?: string;
  title?: string;
  body?: string;
  read?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface FirebaseEmailPasswordCredentials {
  email: string;
  password: string;
  captchaResponse?: string;
  clientType?: string;
  recaptchaVersion?: string;
}

export interface FirebaseEmailPasswordSignUpRequest
  extends FirebaseEmailPasswordCredentials {
  displayName?: string;
  persistSession?: boolean;
}

export interface FirebaseEmailPasswordSignInRequest
  extends FirebaseEmailPasswordCredentials {
  persistSession?: boolean;
}

export interface FirebaseCustomTokenSignInRequest {
  token: string;
  persistSession?: boolean;
}

export interface FirebaseIdpSignInRequest {
  requestUri?: string;
  postBody: string;
  returnIdpCredential?: boolean;
  returnSecureToken?: boolean;
  autoCreate?: boolean;
  idToken?: string;
  pendingToken?: string;
  sessionId?: string;
  captchaResponse?: string;
  tenantId?: string;
  persistSession?: boolean;
}

export interface FirebaseAuthSession {
  kind?: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  localId: string;
  email?: string;
  displayName?: string;
  registered?: boolean;
  photoUrl?: string;
  raw: Record<string, unknown>;
}

export interface FirebaseTokenRefreshResponse {
  accessToken: string;
  expiresIn: number;
  idToken: string;
  projectId?: string;
  refreshToken: string;
  tokenType?: string;
  userId: string;
  raw: Record<string, unknown>;
}

export interface FirebaseAccountInfo {
  localId?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  providerUserInfo?: unknown[];
  passwordHash?: string;
  passwordUpdatedAt?: number;
  validSince?: string;
  lastLoginAt?: string;
  createdAt?: string;
  customAuth?: boolean;
  [key: string]: unknown;
}

export interface FirebaseLookupResponse {
  kind?: string;
  users?: FirebaseAccountInfo[];
  raw: Record<string, unknown>;
}

export interface FirebaseProfileUpdateRequest {
  idToken?: string;
  displayName?: string;
  photoUrl?: string;
  password?: string;
  deleteAttribute?: Array<"DISPLAY_NAME" | "PHOTO_URL">;
  deleteProvider?: string[];
  returnSecureToken?: boolean;
  tenantId?: string;
  persistSession?: boolean;
}

export interface FirebaseSendOobCodeRequest {
  requestType: "VERIFY_EMAIL" | "PASSWORD_RESET" | "EMAIL_SIGNIN";
  email?: string;
  idToken?: string;
  continueUrl?: string;
  dynamicLinkDomain?: string;
  canHandleCodeInApp?: boolean;
  languageCode?: string;
  tenantId?: string;
  captchaResponse?: string;
}

export interface TsoAuthorizationCodeRequest {
  code: string;
  codeVerifier: string;
  redirectUri?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface TsoRefreshTokenRequest {
  refreshToken: string;
  clientId?: string;
  clientSecret?: string;
}

export interface TsoOAuthTokenResponse {
  tokenType?: string;
  expiresIn: number;
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  raw: Record<string, unknown>;
}

export interface UserDisplayNameChangeRequest {
  userId: string;
  displayName: string;
}

export interface UserAnotherNameChangeRequest {
  userId: string;
  anotherName: string;
}

export interface UserIconSourceChangeRequest {
  userId: string;
  iconSource: string;
}

export interface OwnerUserIdChangeRequest {
  userId: string;
}

export interface SceneLoadRequest {}

export interface SequencePlayStartRequest {
  jsonPath: string;
}

export interface SequenceRecordingStartRequest {
  sequenceName: string;
}

export enum NameplateDisplayPositionType {
  Left = 0,
  Right = 1,
  Center = 2,
}

export interface NameplateNormalDisplayedMessage {
  id: string;
  positionType: NameplateDisplayPositionType;
}

export interface NameplateSpecialDisplayedMessage {
  id: string;
  nameplateTemplateId: string;
}

export interface TsoFileFetchOptions {
  clientId?: string;
  isModifierEnabled?: boolean;
}

export interface TsoFileStatusOptions {
  clientId?: string;
}
