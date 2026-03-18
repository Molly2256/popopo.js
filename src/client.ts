import {
  createDefaultEndpoints,
  mergeEndpoints,
  type PopopoEndpointSet,
} from "./endpoints.ts";
import { PopopoConfigurationError } from "./errors.ts";
import { HttpClient, type FetchLike, type RequestQuery } from "./http.ts";
import type {
  AccountProfilePatch,
  AuthState,
  DeepPartial,
  FirebaseAccountInfo,
  FirebaseAuthSession,
  FirebaseClientConfig,
  FirebaseCustomTokenSignInRequest,
  FirebaseEmailPasswordSignInRequest,
  FirebaseEmailPasswordSignUpRequest,
  FirebaseIdpSignInRequest,
  FirebaseLookupResponse,
  FirebaseProfileUpdateRequest,
  FirebaseSendOobCodeRequest,
  FirebaseTokenRefreshResponse,
  Invite,
  NameplateNormalDisplayedMessage,
  NameplateSpecialDisplayedMessage,
  NotificationItem,
  OwnerUserIdChangeRequest,
  SceneLoadRequest,
  SequencePlayStartRequest,
  SequenceRecordingStartRequest,
  Space,
  TsoAuthorizationCodeRequest,
  TsoClientConfig,
  TsoFileFetchOptions,
  TsoFileStatusOptions,
  TsoOAuthTokenResponse,
  TsoRefreshTokenRequest,
  UserAnotherNameChangeRequest,
  UserDisplayNameChangeRequest,
  UserIconSourceChangeRequest,
  UserProfile,
} from "./types.ts";

export const DEFAULT_POPOPO_BASE_URL = "https://www.popopo.com";
export const DEFAULT_FIREBASE_API_KEY = "AIzaSyAmY4T-_U3IGS_TvD5ERQsr2HQsHUmaapc";
export const DEFAULT_FIREBASE_APP_ID =
  "1:209007912111:android:a92e14f304f77c0c33e05a";
export const DEFAULT_FIREBASE_AUTH_DOMAIN = "popopo.firebaseapp.com";
export const DEFAULT_FIREBASE_PROJECT_ID = "popopo-prod";
export const DEFAULT_FIREBASE_STORAGE_BUCKET = "popopo-prod.firebasestorage.app";
export const DEFAULT_FIREBASE_WEB_CLIENT_ID =
  "209007912111-eh2o06rp2h47lq89iheluudr53ena8o8.apps.googleusercontent.com";
export const DEFAULT_FIREBASE_AUTH_BASE_URL =
  "https://www.googleapis.com/identitytoolkit/v3/relyingparty";
export const DEFAULT_FIREBASE_SECURE_TOKEN_BASE_URL =
  "https://securetoken.googleapis.com/v1";
export const DEFAULT_TSO_OAUTH_BASE_URL = "https://oauth.dev.seed.virtualcast.jp";
const DEFAULT_FIREBASE_ANDROID_CLIENT_TYPE = "CLIENT_TYPE_ANDROID";
const DEFAULT_FIREBASE_RECAPTCHA_VERSION = "RECAPTCHA_ENTERPRISE";

export const DEFAULT_FIREBASE_CONFIG: FirebaseClientConfig = {
  apiKey: DEFAULT_FIREBASE_API_KEY,
  appId: DEFAULT_FIREBASE_APP_ID,
  authBaseUrl: DEFAULT_FIREBASE_AUTH_BASE_URL,
  authDomain: DEFAULT_FIREBASE_AUTH_DOMAIN,
  projectId: DEFAULT_FIREBASE_PROJECT_ID,
  secureTokenBaseUrl: DEFAULT_FIREBASE_SECURE_TOKEN_BASE_URL,
  storageBucket: DEFAULT_FIREBASE_STORAGE_BUCKET,
  webClientId: DEFAULT_FIREBASE_WEB_CLIENT_ID,
  returnSecureToken: true,
};

export interface PopopoClientOptions {
  baseUrl?: string;
  apiBasePath?: string;
  fetch?: FetchLike;
  headers?: HeadersInit;
  session?: AuthState;
  firebase?: Partial<FirebaseClientConfig>;
  tso?: Partial<TsoClientConfig>;
  endpoints?: DeepPartial<PopopoEndpointSet>;
}

interface ResolvedClientOptions {
  baseUrl: string;
  apiBasePath: string;
  firebase: FirebaseClientConfig;
  tso: TsoClientConfig;
}

interface ClientRuntime {
  readonly http: HttpClient;
  readonly endpoints: PopopoEndpointSet;
  readonly options: ResolvedClientOptions;
}

export class PopopoClient {
  readonly http: HttpClient;
  readonly auth: FirebaseAuthClient;
  readonly accounts: AccountsClient;
  readonly spaces: SpacesClient;
  readonly invites: InvitesClient;
  readonly notifications: NotificationsClient;
  readonly scenes: ScenesClient;
  readonly sequences: SequencesClient;
  readonly nameplates: NameplatesClient;
  readonly tso: TsoClient;
  readonly endpoints: PopopoEndpointSet;

  private readonly runtime: ClientRuntime;

  constructor(options: PopopoClientOptions = {}) {
    const resolved = resolveClientOptions(options);
    const session: AuthState = { ...(options.session ?? {}) };
    const endpoints = mergeEndpoints(
      createDefaultEndpoints(resolved.apiBasePath),
      options.endpoints,
    );
    const http = new HttpClient({
      baseUrl: resolved.baseUrl,
      session,
      fetchImplementation: options.fetch,
      defaultHeaders: options.headers,
    });

    this.runtime = {
      http,
      endpoints,
      options: resolved,
    };
    this.http = http;
    this.endpoints = endpoints;
    this.auth = new FirebaseAuthClient(this.runtime);
    this.accounts = new AccountsClient(this.runtime);
    this.spaces = new SpacesClient(this.runtime);
    this.invites = new InvitesClient(this.runtime);
    this.notifications = new NotificationsClient(this.runtime);
    this.scenes = new ScenesClient(this.runtime);
    this.sequences = new SequencesClient(this.runtime);
    this.nameplates = new NameplatesClient(this.runtime);
    this.tso = new TsoClient(this.runtime);
  }

  getSession(): Readonly<AuthState> {
    return this.http.getSession();
  }

  setSession(session: Partial<AuthState>): AuthState {
    return this.http.setSession(session);
  }

  clearSession(): AuthState {
    return this.http.clearSession();
  }
}

export class FirebaseAuthClient {
  constructor(private readonly runtime: ClientRuntime) {}

  async signUpWithEmailPassword(
    input: FirebaseEmailPasswordSignUpRequest,
  ): Promise<FirebaseAuthSession> {
    const payload = await this.runtime.http.request<Record<string, unknown>>({
      method: "POST",
      url: buildFirebaseUrl(
        this.runtime.options.firebase.authBaseUrl,
        "signupNewUser",
      ),
      auth: "none",
      query: {
        key: this.runtime.options.firebase.apiKey,
      },
      body: withAndroidClientInfo(
        compactObject({
          email: input.email,
          password: input.password,
          tenantId: this.runtime.options.firebase.tenantId,
        }),
        input.captchaResponse,
        input.clientType,
        input.recaptchaVersion,
      ),
    });
    const session = toFirebaseSession(payload);

    if (input.persistSession !== false) {
      applyFirebaseSession(this.runtime.http, session);
    }

    if (input.displayName) {
      return this.updateProfile({
        idToken: session.idToken,
        displayName: input.displayName,
        returnSecureToken: true,
        persistSession: input.persistSession,
      });
    }

    return session;
  }

  async signInWithEmailPassword(
    input: FirebaseEmailPasswordSignInRequest,
  ): Promise<FirebaseAuthSession> {
    const payload = await this.runtime.http.request<Record<string, unknown>>({
      method: "POST",
      url: buildFirebaseUrl(
        this.runtime.options.firebase.authBaseUrl,
        "verifyPassword",
      ),
      auth: "none",
      query: {
        key: this.runtime.options.firebase.apiKey,
      },
      body: withAndroidClientInfo(
        compactObject({
          email: input.email,
          password: input.password,
          returnSecureToken: this.runtime.options.firebase.returnSecureToken,
          tenantId: this.runtime.options.firebase.tenantId,
        }),
        input.captchaResponse,
        input.clientType,
        input.recaptchaVersion,
      ),
    });
    const session = toFirebaseSession(payload);

    if (input.persistSession !== false) {
      applyFirebaseSession(this.runtime.http, session);
    }

    return session;
  }

  async signInWithCustomToken(
    input: FirebaseCustomTokenSignInRequest,
  ): Promise<FirebaseAuthSession> {
    const payload = await this.runtime.http.request<Record<string, unknown>>({
      method: "POST",
      url: buildFirebaseUrl(
        this.runtime.options.firebase.authBaseUrl,
        "verifyCustomToken",
      ),
      auth: "none",
      query: {
        key: this.runtime.options.firebase.apiKey,
      },
      body: compactObject({
        token: input.token,
        returnSecureToken: this.runtime.options.firebase.returnSecureToken,
        tenantId: this.runtime.options.firebase.tenantId,
      }),
    });
    const session = toFirebaseSession(payload);

    if (input.persistSession !== false) {
      applyFirebaseSession(this.runtime.http, session);
    }

    return session;
  }

  async signInWithIdp(
    input: FirebaseIdpSignInRequest,
  ): Promise<FirebaseAuthSession> {
    const payload = await this.runtime.http.request<Record<string, unknown>>({
      method: "POST",
      url: buildFirebaseUrl(
        this.runtime.options.firebase.authBaseUrl,
        "verifyAssertion",
      ),
      auth: "none",
      query: {
        key: this.runtime.options.firebase.apiKey,
      },
      body: compactObject({
        requestUri:
          input.requestUri ??
          `https://${this.runtime.options.firebase.authDomain}`,
        postBody: input.postBody,
        returnSecureToken:
          input.returnSecureToken ?? this.runtime.options.firebase.returnSecureToken,
        returnIdpCredential: input.returnIdpCredential,
        autoCreate: input.autoCreate,
        idToken: input.idToken,
        pendingToken: input.pendingToken,
        sessionId: input.sessionId,
        captchaResponse: input.captchaResponse,
        tenantId: input.tenantId ?? this.runtime.options.firebase.tenantId,
      }),
    });
    const session = toFirebaseSession(payload);

    if (input.persistSession !== false) {
      applyFirebaseSession(this.runtime.http, session);
    }

    return session;
  }

  async refreshFirebaseIdToken(
    refreshToken = this.runtime.http.getSession().refreshToken,
  ): Promise<FirebaseTokenRefreshResponse> {
    if (!refreshToken) {
      throw new PopopoConfigurationError("No Firebase refresh token is available.");
    }

    const payload = await this.runtime.http.request<Record<string, unknown>>({
      method: "POST",
      url: buildFirebaseUrl(
        this.runtime.options.firebase.secureTokenBaseUrl,
        "token",
      ),
      auth: "none",
      query: {
        key: this.runtime.options.firebase.apiKey,
      },
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const refreshed = toFirebaseRefreshResponse(payload);
    applyFirebaseRefresh(this.runtime.http, refreshed);
    return refreshed;
  }

  async lookup(
    idToken = this.runtime.http.getSession().firebaseIdToken ??
      this.runtime.http.getSession().bearerToken,
  ): Promise<FirebaseLookupResponse> {
    if (!idToken) {
      throw new PopopoConfigurationError("No Firebase ID token is available.");
    }

    const payload = await this.runtime.http.request<Record<string, unknown>>({
      method: "POST",
      url: buildFirebaseUrl(
        this.runtime.options.firebase.authBaseUrl,
        "getAccountInfo",
      ),
      auth: "none",
      query: {
        key: this.runtime.options.firebase.apiKey,
      },
      body: {
        idToken,
      },
    });

    return {
      kind: asOptionalString(payload.kind),
      users: Array.isArray(payload.users)
        ? (payload.users as FirebaseAccountInfo[])
        : undefined,
      raw: payload,
    };
  }

  async getCurrentUser(): Promise<FirebaseAccountInfo | undefined> {
    const lookup = await this.lookup();
    return lookup.users?.[0];
  }

  async updateProfile(
    input: FirebaseProfileUpdateRequest,
  ): Promise<FirebaseAuthSession> {
    const idToken =
      input.idToken ??
      this.runtime.http.getSession().firebaseIdToken ??
      this.runtime.http.getSession().bearerToken;

    if (!idToken) {
      throw new PopopoConfigurationError("No Firebase ID token is available.");
    }

    const payload = await this.runtime.http.request<Record<string, unknown>>({
      method: "POST",
      url: buildFirebaseUrl(
        this.runtime.options.firebase.authBaseUrl,
        "setAccountInfo",
      ),
      auth: "none",
      query: {
        key: this.runtime.options.firebase.apiKey,
      },
      body: {
        idToken,
        displayName: input.displayName,
        photoUrl: input.photoUrl,
        password: input.password,
        deleteAttribute: input.deleteAttribute,
        deleteProvider: input.deleteProvider,
        returnSecureToken:
          input.returnSecureToken ??
          this.runtime.options.firebase.returnSecureToken,
        tenantId: input.tenantId ?? this.runtime.options.firebase.tenantId,
      },
    });
    const session = toFirebaseSession(payload);

    if (input.persistSession !== false) {
      applyFirebaseSession(this.runtime.http, session);
    }

    return session;
  }

  sendOobCode(
    input: FirebaseSendOobCodeRequest,
  ): Promise<Record<string, unknown>> {
    return this.runtime.http.request<Record<string, unknown>>({
      method: "POST",
      url: buildFirebaseUrl(
        this.runtime.options.firebase.authBaseUrl,
        "getOobConfirmationCode",
      ),
      auth: "none",
      query: {
        key: this.runtime.options.firebase.apiKey,
      },
      body: {
        ...input,
        tenantId: input.tenantId ?? this.runtime.options.firebase.tenantId,
      },
    });
  }

  sendPasswordResetEmail(
    email: string,
    options: Omit<FirebaseSendOobCodeRequest, "email" | "requestType"> = {},
  ): Promise<Record<string, unknown>> {
    return this.sendOobCode({
      ...options,
      email,
      requestType: "PASSWORD_RESET",
    });
  }

  sendEmailVerification(
    idToken = this.runtime.http.getSession().firebaseIdToken ??
      this.runtime.http.getSession().bearerToken,
    options: Omit<FirebaseSendOobCodeRequest, "idToken" | "requestType"> = {},
  ): Promise<Record<string, unknown>> {
    if (!idToken) {
      throw new PopopoConfigurationError("No Firebase ID token is available.");
    }

    return this.sendOobCode({
      ...options,
      idToken,
      requestType: "VERIFY_EMAIL",
    });
  }

  signOut(): void {
    this.runtime.http.clearSession();
  }
}

export class AccountsClient {
  constructor(private readonly runtime: ClientRuntime) {}

  getMe<TResponse = UserProfile>(): Promise<TResponse> {
    return this.runtime.http.get<TResponse>(this.runtime.endpoints.users.me);
  }

  list<TResponse = UserProfile[]>(query?: RequestQuery): Promise<TResponse> {
    return this.runtime.http.get<TResponse>(this.runtime.endpoints.users.collection, {
      query,
    });
  }

  getById<TResponse = UserProfile>(userId: string): Promise<TResponse> {
    return this.runtime.http.get<TResponse>(this.runtime.endpoints.users.byId(userId));
  }

  updateMe<TResponse = UserProfile>(
    patch: AccountProfilePatch,
  ): Promise<TResponse> {
    return this.runtime.http.patch<TResponse, AccountProfilePatch>(
      this.runtime.endpoints.users.me,
      patch,
    );
  }

  changeDisplayName<TResponse = unknown>(
    displayName: string,
    userId = requireUserId(this.runtime.http),
  ): Promise<TResponse> {
    const payload: UserDisplayNameChangeRequest = {
      userId,
      displayName,
    };
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.users.updateDisplayName,
      {
        UserId: payload.userId,
        DisplayName: payload.displayName,
      },
    );
  }

  changeAnotherName<TResponse = unknown>(
    anotherName: string,
    userId = requireUserId(this.runtime.http),
  ): Promise<TResponse> {
    const payload: UserAnotherNameChangeRequest = {
      userId,
      anotherName,
    };
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.users.updateAnotherName,
      {
        UserId: payload.userId,
        AnotherName: payload.anotherName,
      },
    );
  }

  changeIconSource<TResponse = unknown>(
    iconSource: string,
    userId = requireUserId(this.runtime.http),
  ): Promise<TResponse> {
    const payload: UserIconSourceChangeRequest = {
      userId,
      iconSource,
    };
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.users.updateIconSource,
      {
        UserId: payload.userId,
        IconSource: payload.iconSource,
      },
    );
  }

  changeOwnerUserId<TResponse = unknown>(
    userId = requireUserId(this.runtime.http),
  ): Promise<TResponse> {
    const payload: OwnerUserIdChangeRequest = {
      userId,
    };
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.users.changeOwnerUserId,
      {
        UserId: payload.userId,
      },
    );
  }
}

export class SpacesClient {
  constructor(private readonly runtime: ClientRuntime) {}

  list<TResponse = Space[]>(query?: RequestQuery): Promise<TResponse> {
    return this.runtime.http.get<TResponse>(this.runtime.endpoints.spaces.collection, {
      query,
    });
  }

  getById<TResponse = Space>(spaceId: string): Promise<TResponse> {
    return this.runtime.http.get<TResponse>(this.runtime.endpoints.spaces.byId(spaceId));
  }
}

export class InvitesClient {
  constructor(private readonly runtime: ClientRuntime) {}

  list<TResponse = Invite[]>(query?: RequestQuery): Promise<TResponse> {
    return this.runtime.http.get<TResponse>(
      this.runtime.endpoints.invites.collection,
      { query },
    );
  }

  getByCode<TResponse = Invite>(code: string): Promise<TResponse> {
    return this.runtime.http.get<TResponse>(this.runtime.endpoints.invites.byCode(code));
  }

  accept<TResponse = unknown>(
    code: string,
    body?: Record<string, unknown>,
  ): Promise<TResponse> {
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.invites.accept(code),
      body,
    );
  }
}

export class NotificationsClient {
  constructor(private readonly runtime: ClientRuntime) {}

  list<TResponse = NotificationItem[]>(
    query?: RequestQuery,
  ): Promise<TResponse> {
    return this.runtime.http.get<TResponse>(
      this.runtime.endpoints.notifications.collection,
      { query },
    );
  }

  getById<TResponse = NotificationItem>(
    notificationId: string,
  ): Promise<TResponse> {
    return this.runtime.http.get<TResponse>(
      this.runtime.endpoints.notifications.byId(notificationId),
    );
  }

  markRead<TResponse = unknown>(notificationId: string): Promise<TResponse> {
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.notifications.markRead(notificationId),
      {},
    );
  }
}

export class ScenesClient {
  constructor(private readonly runtime: ClientRuntime) {}

  load<TResponse = unknown>(
    request: SceneLoadRequest = {},
  ): Promise<TResponse> {
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.ipc.sceneLoad,
      request,
    );
  }

  exit<TResponse = unknown>(): Promise<TResponse> {
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.ipc.sceneExit,
      {},
    );
  }

  cancelCurrent<TResponse = unknown>(): Promise<TResponse> {
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.ipc.cancelCurrentSceneRequests,
      {},
    );
  }
}

export class SequencesClient {
  constructor(private readonly runtime: ClientRuntime) {}

  startPlayback<TResponse = unknown>(
    request: SequencePlayStartRequest,
  ): Promise<TResponse> {
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.ipc.sequencePlayStart,
      {
        JsonPath: request.jsonPath,
      },
    );
  }

  stopPlayback<TResponse = unknown>(): Promise<TResponse> {
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.ipc.sequencePlayStop,
      {},
    );
  }

  startRecording<TResponse = unknown>(
    request: SequenceRecordingStartRequest,
  ): Promise<TResponse> {
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.ipc.sequenceRecordingStart,
      {
        SequenceName: request.sequenceName,
      },
    );
  }

  stopRecording<TResponse = unknown>(): Promise<TResponse> {
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.ipc.sequenceRecordingStop,
      {},
    );
  }
}

export class NameplatesClient {
  constructor(private readonly runtime: ClientRuntime) {}

  displayNormal<TResponse = unknown>(
    message: NameplateNormalDisplayedMessage,
  ): Promise<TResponse> {
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.ipc.nameplateNormal,
      {
        Id: message.id,
        PositionType: message.positionType,
      },
    );
  }

  displaySpecial<TResponse = unknown>(
    message: NameplateSpecialDisplayedMessage,
  ): Promise<TResponse> {
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.ipc.nameplateSpecial,
      {
        Id: message.id,
        NameplateTemplateId: message.nameplateTemplateId,
      },
    );
  }

  clear<TResponse = unknown>(): Promise<TResponse> {
    return this.runtime.http.post<TResponse>(
      this.runtime.endpoints.ipc.nameplateClear,
      {},
    );
  }
}

export class TsoClient {
  constructor(private readonly runtime: ClientRuntime) {}

  async exchangeAuthorizationCode(
    input: TsoAuthorizationCodeRequest,
  ): Promise<TsoOAuthTokenResponse> {
    const payload = await this.runtime.http.request<Record<string, unknown>>({
      method: "POST",
      url: buildAbsoluteUrl(this.runtime.options.tso.oauthBaseUrl, "/oauth/token"),
      auth: "none",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(compactStringRecord({
        grant_type: "authorization_code",
        code: input.code,
        code_verifier: input.codeVerifier,
        redirect_uri: input.redirectUri ?? this.runtime.options.tso.redirectUri,
        client_id: input.clientId ?? this.runtime.options.tso.clientId,
        client_secret: input.clientSecret ?? this.runtime.options.tso.clientSecret,
      })),
    });

    return toTsoTokenResponse(payload);
  }

  async refreshAccessToken(
    input: TsoRefreshTokenRequest | string,
  ): Promise<TsoOAuthTokenResponse> {
    const request =
      typeof input === "string" ? { refreshToken: input } : input;

    const payload = await this.runtime.http.request<Record<string, unknown>>({
      method: "POST",
      url: buildAbsoluteUrl(this.runtime.options.tso.oauthBaseUrl, "/oauth/token"),
      auth: "none",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(compactStringRecord({
        grant_type: "refresh_token",
        refresh_token: request.refreshToken,
        client_id: request.clientId ?? this.runtime.options.tso.clientId,
        client_secret: request.clientSecret ?? this.runtime.options.tso.clientSecret,
      })),
    });

    return toTsoTokenResponse(payload);
  }

  buildFileFetchUrl(fileId: string, options: TsoFileFetchOptions = {}): string {
    const baseUrl = requireTsoFileApiBaseUrl(this.runtime.options.tso);
    const url = new URL("/", ensureTrailingSlash(baseUrl));
    const clientId = options.clientId ?? this.runtime.options.tso.clientId;

    url.searchParams.set("file_id", fileId);

    if (clientId) {
      url.searchParams.set("client_id", clientId);
    }

    if (options.isModifierEnabled) {
      url.searchParams.set("is_enabled_modifier", "true");
    }

    return url.toString();
  }

  buildFileStatusUrl(
    fileId: string,
    options: TsoFileStatusOptions = {},
  ): string {
    const baseUrl = requireTsoFileApiBaseUrl(this.runtime.options.tso);
    const url = new URL("/status", ensureTrailingSlash(baseUrl));
    const clientId = options.clientId ?? this.runtime.options.tso.clientId;

    url.searchParams.set("file_id", fileId);

    if (clientId) {
      url.searchParams.set("client_id", clientId);
    }

    return url.toString();
  }

  fetchFileStatus<TResponse = unknown>(
    fileId: string,
    options: TsoFileStatusOptions = {},
  ): Promise<TResponse> {
    return this.runtime.http.request<TResponse>({
      method: "GET",
      url: this.buildFileStatusUrl(fileId, options),
      auth: "none",
    });
  }

  fetchFile(
    fileId: string,
    options: TsoFileFetchOptions = {},
  ): Promise<Response> {
    return this.runtime.http.request<Response>({
      method: "GET",
      url: this.buildFileFetchUrl(fileId, options),
      auth: "none",
      parseAs: "response",
    });
  }
}

function resolveClientOptions(options: PopopoClientOptions): ResolvedClientOptions {
  return {
    baseUrl: options.baseUrl ?? DEFAULT_POPOPO_BASE_URL,
    apiBasePath: options.apiBasePath ?? "",
    firebase: {
      apiKey: options.firebase?.apiKey ?? DEFAULT_FIREBASE_CONFIG.apiKey,
      appId: options.firebase?.appId ?? DEFAULT_FIREBASE_CONFIG.appId,
      authBaseUrl:
        options.firebase?.authBaseUrl ?? DEFAULT_FIREBASE_CONFIG.authBaseUrl,
      authDomain:
        options.firebase?.authDomain ?? DEFAULT_FIREBASE_CONFIG.authDomain,
      projectId:
        options.firebase?.projectId ?? DEFAULT_FIREBASE_CONFIG.projectId,
      secureTokenBaseUrl:
        options.firebase?.secureTokenBaseUrl ??
        DEFAULT_FIREBASE_CONFIG.secureTokenBaseUrl,
      storageBucket:
        options.firebase?.storageBucket ?? DEFAULT_FIREBASE_CONFIG.storageBucket,
      webClientId:
        options.firebase?.webClientId ?? DEFAULT_FIREBASE_CONFIG.webClientId,
      returnSecureToken:
        options.firebase?.returnSecureToken ?? DEFAULT_FIREBASE_CONFIG.returnSecureToken,
      tenantId: options.firebase?.tenantId,
    },
    tso: {
      oauthBaseUrl:
        options.tso?.oauthBaseUrl ?? DEFAULT_TSO_OAUTH_BASE_URL,
      fileApiBaseUrl: options.tso?.fileApiBaseUrl,
      clientId: options.tso?.clientId,
      clientSecret: options.tso?.clientSecret,
      redirectUri: options.tso?.redirectUri,
    },
  };
}

function buildFirebaseUrl(baseUrl: string, suffix: string): string {
  return buildAbsoluteUrl(baseUrl, `/${suffix}`);
}

function buildAbsoluteUrl(baseUrl: string, suffix: string): string {
  const url = new URL(ensureTrailingSlash(baseUrl));
  const normalizedBasePath = url.pathname.replace(/\/+$/, "");
  const normalizedSuffix = suffix.replace(/^\/+/, "");

  url.pathname =
    `${normalizedBasePath}/${normalizedSuffix}`.replace(/\/{2,}/g, "/");

  return url.toString();
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function toFirebaseSession(payload: Record<string, unknown>): FirebaseAuthSession {
  const idToken = requiredString(payload, ["idToken", "id_token"]);
  const refreshToken = requiredString(payload, ["refreshToken", "refresh_token"]);
  const localId = requiredString(payload, ["localId", "user_id"]);
  const expiresIn = requiredNumber(payload, ["expiresIn", "expires_in"]);

  return {
    kind: asOptionalString(payload.kind),
    idToken,
    refreshToken,
    expiresIn,
    localId,
    email: asOptionalString(payload.email),
    displayName: asOptionalString(payload.displayName),
    registered: typeof payload.registered === "boolean" ? payload.registered : undefined,
    photoUrl: asOptionalString(payload.photoUrl),
    raw: payload,
  };
}

function toFirebaseRefreshResponse(
  payload: Record<string, unknown>,
): FirebaseTokenRefreshResponse {
  return {
    accessToken: requiredString(payload, ["access_token", "accessToken"]),
    expiresIn: requiredNumber(payload, ["expires_in", "expiresIn"]),
    idToken: requiredString(payload, ["id_token", "idToken"]),
    projectId: asOptionalString(payload.project_id),
    refreshToken: requiredString(payload, ["refresh_token", "refreshToken"]),
    tokenType: asOptionalString(payload.token_type),
    userId: requiredString(payload, ["user_id", "localId"]),
    raw: payload,
  };
}

function toTsoTokenResponse(payload: Record<string, unknown>): TsoOAuthTokenResponse {
  return {
    tokenType: asOptionalString(payload.token_type),
    expiresIn: requiredNumber(payload, ["expires_in", "expiresIn"]),
    accessToken: requiredString(payload, ["access_token", "accessToken"]),
    refreshToken: asOptionalString(payload.refresh_token),
    scope: asOptionalString(payload.scope),
    raw: payload,
  };
}

function applyFirebaseSession(http: HttpClient, session: FirebaseAuthSession): void {
  http.setSession({
    bearerToken: session.idToken,
    firebaseIdToken: session.idToken,
    refreshToken: session.refreshToken,
    userId: session.localId,
    email: session.email,
  });
}

function applyFirebaseRefresh(
  http: HttpClient,
  refresh: FirebaseTokenRefreshResponse,
): void {
  http.setSession({
    bearerToken: refresh.idToken,
    firebaseIdToken: refresh.idToken,
    refreshToken: refresh.refreshToken,
    userId: refresh.userId,
  });
}

function withAndroidClientInfo(
  record: Record<string, unknown>,
  captchaResponse?: string,
  clientType?: string,
  recaptchaVersion?: string,
): Record<string, unknown> {
  const next = compactObject({
    ...record,
    clientType: clientType ?? DEFAULT_FIREBASE_ANDROID_CLIENT_TYPE,
  });

  if (!captchaResponse) {
    return next;
  }

  return compactObject({
    ...next,
    captchaResponse,
    recaptchaVersion: recaptchaVersion ?? DEFAULT_FIREBASE_RECAPTCHA_VERSION,
  });
}

function requireUserId(http: HttpClient): string {
  const userId = http.getSession().userId;

  if (!userId) {
    throw new PopopoConfigurationError(
      "No userId is available. Sign in first or set `session.userId` explicitly.",
    );
  }

  return userId;
}

function requireTsoFileApiBaseUrl(config: TsoClientConfig): string {
  if (!config.fileApiBaseUrl) {
    throw new PopopoConfigurationError(
      "TSO file API base URL is not configured. Set `tso.fileApiBaseUrl` first.",
    );
  }

  return config.fileApiBaseUrl;
}

function requiredString(
  payload: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  throw new PopopoConfigurationError(
    `Response payload does not contain a required string field: ${keys.join(", ")}`,
  );
}

function requiredNumber(
  payload: Record<string, unknown>,
  keys: string[],
): number {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  throw new PopopoConfigurationError(
    `Response payload does not contain a required numeric field: ${keys.join(", ")}`,
  );
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function compactObject(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) {
      next[key] = value;
    }
  }

  return next;
}

function compactStringRecord(
  record: Record<string, string | undefined>,
): Record<string, string> {
  const next: Record<string, string> = {};

  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) {
      next[key] = value;
    }
  }

  return next;
}
