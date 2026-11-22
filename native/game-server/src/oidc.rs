//! The relying-party SDK validates provider tokens. Pending state belongs to
//! this browser and is consumed once, before any token exchange.

use crate::{
    authority::{AccessError, Authority, invites::InviteHash, now_ms},
    network::{NetworkError, NetworkOperation, NetworkOwner, permitted_destination},
};
use openidconnect::{
    AccessTokenHash, AsyncHttpClient, AuthenticationFlow, AuthorizationCode, ClientId,
    ClientSecret, CsrfToken, EndpointMaybeSet, EndpointNotSet, EndpointSet, HttpRequest,
    HttpResponse, IssuerUrl, Nonce, OAuth2TokenResponse, PkceCodeChallenge, PkceCodeVerifier,
    RedirectUrl, TokenResponse,
    core::{CoreAuthPrompt, CoreClient, CoreProviderMetadata, CoreResponseType},
};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    future::Future,
    pin::Pin,
    sync::{Arc, Mutex},
    time::Duration,
};
use tokio::{sync::watch, time::Instant};

const OPERATION: Duration = Duration::from_secs(30);
const EXCHANGE: Duration = Duration::from_secs(10);
const PENDING_LIFETIME: Duration = Duration::from_secs(300);
const BODY_BYTES: usize = 1_048_576;
const PENDING_CAPACITY: usize = 256;
// SDK parsing can overlap its received body and the validated key/token
// graph. The operation holds both budgets through verification.
const SDK_WORKSPACE: usize = 24 * BODY_BYTES;

type Client = CoreClient<
    EndpointSet,
    EndpointNotSet,
    EndpointNotSet,
    EndpointNotSet,
    EndpointMaybeSet,
    EndpointMaybeSet,
>;
type Discovery = watch::Receiver<Option<Result<Arc<Discovered>, OidcError>>>;

struct Discovered {
    client: Client,
    _custody: ByteReservation,
}

#[derive(Clone, Copy, Debug)]
pub enum OidcError {
    Config,
    Session,
    Provider,
    Network(NetworkError),
}

impl From<NetworkError> for OidcError {
    fn from(error: NetworkError) -> Self {
        Self::Network(error)
    }
}
impl std::fmt::Display for OidcError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Config => f.write_str("OpenID Connect configuration is invalid"),
            Self::Session => f.write_str("The browser's sign-in attempt expired or changed"),
            Self::Provider => f.write_str("The identity provider did not confirm a valid login"),
            Self::Network(error) => error.fmt(f),
        }
    }
}
impl std::error::Error for OidcError {}

struct SdkExchange<'a>(&'a NetworkOperation<'a>);
impl<'a> AsyncHttpClient<'a> for SdkExchange<'_> {
    type Error = NetworkError;
    type Future = Pin<Box<dyn Future<Output = Result<HttpResponse, NetworkError>> + Send + 'a>>;

    fn call(&'a self, input: HttpRequest) -> Self::Future {
        Box::pin(async move {
            let request =
                reqwest::Request::try_from(input).map_err(|_| NetworkError::Destination)?;
            self.0.bytes(request, BODY_BYTES, EXCHANGE).await
        })
    }
}

struct Pending {
    browser: [u8; 32],
    invitation: Option<InviteHash>,
    verifier: PkceCodeVerifier,
    nonce: Nonce,
    until: Instant,
    expires_at: i64,
    _custody: ByteReservation,
}

pub(crate) struct LoginCompletion {
    pub(crate) token: String,
    pub(crate) invitation: Option<InviteHash>,
    pub(crate) deadline: Instant,
    pub(crate) expires_at: i64,
}

pub struct Oidc {
    public_origin: String,
    issuer: IssuerUrl,
    client_id: ClientId,
    client_secret: Option<ClientSecret>,
    redirect: RedirectUrl,
    network: NetworkOwner,
    allow_loopback_http: bool,
    pending: Mutex<HashMap<String, Pending>>,
    budget: ByteBudget,
    discovery: Mutex<Option<Discovery>>,
}

impl Oidc {
    pub fn new(
        public_origin: String,
        issuer: String,
        client_id: String,
        client_secret: Option<String>,
        allow_loopback_http: bool,
        budget: ByteBudget,
    ) -> Result<Arc<Self>, OidcError> {
        let origin = reqwest::Url::parse(&public_origin).map_err(|_| OidcError::Config)?;
        let provider = reqwest::Url::parse(&issuer).map_err(|_| OidcError::Config)?;
        if origin.origin().ascii_serialization() != public_origin
            || client_id.is_empty()
            || provider.query().is_some()
            || provider.fragment().is_some()
            || !permitted_destination(&origin, allow_loopback_http)
            || !permitted_destination(&provider, allow_loopback_http)
        {
            return Err(OidcError::Config);
        }
        let issuer = IssuerUrl::new(provider.into()).map_err(|_| OidcError::Config)?;
        let redirect = RedirectUrl::new(format!("{public_origin}/auth/callback"))
            .map_err(|_| OidcError::Config)?;
        let network = NetworkOwner::new(16, budget.clone(), allow_loopback_http)?;
        Ok(Arc::new(Self {
            public_origin,
            issuer,
            client_id: ClientId::new(client_id),
            client_secret: client_secret.map(ClientSecret::new),
            redirect,
            network,
            allow_loopback_http,
            pending: Mutex::new(HashMap::new()),
            budget,
            discovery: Mutex::new(None),
        }))
    }

    pub fn origin(&self) -> &str {
        &self.public_origin
    }

    async fn discover(&self) -> Result<Arc<Discovered>, OidcError> {
        let operation = self
            .network
            .admit(Instant::now() + EXCHANGE, SDK_WORKSPACE)?;
        let provider =
            CoreProviderMetadata::discover_async(self.issuer.clone(), &SdkExchange(&operation))
                .await
                .map_err(|_| OidcError::Provider)?;
        if !permitted_destination(
            provider.authorization_endpoint().url(),
            self.allow_loopback_http,
        ) {
            return Err(OidcError::Config);
        }
        let client = CoreClient::from_provider_metadata(
            provider,
            self.client_id.clone(),
            self.client_secret.clone(),
        )
        .set_redirect_uri(self.redirect.clone());
        if Instant::now() >= operation.deadline() {
            return Err(NetworkError::Deadline.into());
        }
        Ok(Arc::new(Discovered {
            client,
            _custody: operation.into_workspace(),
        }))
    }

    async fn client(self: &Arc<Self>, deadline: Instant) -> Result<Arc<Discovered>, OidcError> {
        let mut pending = {
            let mut slot = self.discovery.lock().map_err(|_| OidcError::Provider)?;
            if let Some(pending) = slot
                .as_ref()
                .filter(|job| !matches!(*job.borrow(), Some(Err(_))))
            {
                pending.clone()
            } else {
                let service = self.clone();
                let (send, receiver) = watch::channel(None);
                // One caller disconnecting does not cancel shared discovery
                // with a different browser waiting for the same configuration.
                tokio::spawn(async move {
                    send.send_replace(Some(service.discover().await));
                });
                *slot = Some(receiver.clone());
                receiver
            }
        };
        let result = tokio::time::timeout_at(deadline, pending.wait_for(Option::is_some))
            .await
            .map_err(|_| OidcError::Network(NetworkError::Deadline))?
            .map_err(|_| OidcError::Provider)?;
        result.as_ref().expect("observed discovery").clone()
    }

    pub(crate) async fn begin(
        self: &Arc<Self>,
        browser: &str,
        change_account: bool,
        invitation: Option<InviteHash>,
    ) -> Result<reqwest::Url, OidcError> {
        let operation = self.network.admit(Instant::now() + OPERATION, 4096)?;
        let client = self.client(operation.deadline()).await?;
        let (challenge, verifier) = PkceCodeChallenge::new_random_sha256();
        let mut authorize = client
            .client
            .authorize_url(
                AuthenticationFlow::<CoreResponseType>::AuthorizationCode,
                CsrfToken::new_random,
                Nonce::new_random,
            )
            .set_pkce_challenge(challenge);
        if change_account {
            authorize = authorize.add_prompt(CoreAuthPrompt::Login);
        }
        let (url, state, nonce) = authorize.url();
        let mut pending = self.pending.lock().map_err(|_| OidcError::Provider)?;
        let now = Instant::now();
        if operation.deadline() <= now {
            return Err(OidcError::Network(NetworkError::Deadline));
        }
        pending.retain(|_, attempt| attempt.until > now);
        if pending.len() >= PENDING_CAPACITY {
            return Err(OidcError::Network(NetworkError::Busy));
        }
        let custody = self
            .budget
            .reserve(2048)
            .map_err(|_| NetworkError::Capacity)?;
        pending.insert(
            state.secret().clone(),
            Pending {
                browser: Sha256::digest(browser.as_bytes()).into(),
                invitation,
                verifier,
                nonce,
                until: now + PENDING_LIFETIME,
                expires_at: now_ms() + PENDING_LIFETIME.as_millis() as i64,
                _custody: custody,
            },
        );
        Ok(url)
    }

    pub(crate) async fn complete(
        self: &Arc<Self>,
        authority: &Authority,
        state: &str,
        code: Option<String>,
        browser: Option<&str>,
        previous: Option<&str>,
    ) -> Result<LoginCompletion, AccessError> {
        let now = Instant::now();
        let until = {
            let mut pending = self.pending.lock().map_err(|_| AccessError::Availability)?;
            let attempt = pending.get(state).ok_or(AccessError::Session)?;
            let wall_remaining = attempt.expires_at.saturating_sub(now_ms());
            let deadline = attempt.until;
            if deadline <= now || wall_remaining <= 0 {
                pending.remove(state);
                return Err(AccessError::Session);
            }
            deadline
                .min(now + OPERATION)
                .min(now + Duration::from_millis(wall_remaining as u64))
        };
        let operation = self.network.admit(until, SDK_WORKSPACE).map_err(|error| {
            if error == NetworkError::Deadline {
                AccessError::Session
            } else {
                AccessError::Busy
            }
        })?;
        let pending = self
            .pending
            .lock()
            .map_err(|_| AccessError::Availability)?
            .remove(state)
            .ok_or(AccessError::Session)?;
        if browser.map(|token| <[u8; 32]>::from(Sha256::digest(token.as_bytes())))
            != Some(pending.browser)
            || pending.until <= Instant::now()
        {
            return Err(AccessError::Session);
        }
        let code = code
            .filter(|value| !value.is_empty())
            .ok_or(AccessError::Session)?;
        let complete = async {
            let client = self
                .client(until)
                .await
                .map_err(|_| AccessError::Availability)?;
            let response = client
                .client
                .exchange_code(AuthorizationCode::new(code))
                .map_err(|_| AccessError::Availability)?
                .set_pkce_verifier(pending.verifier)
                .request_async(&SdkExchange(&operation))
                .await
                .map_err(|_| AccessError::Session)?;
            let token = response.id_token().ok_or(AccessError::Session)?;
            let verifier = client.client.id_token_verifier();
            let claims = token
                .claims(&verifier, &pending.nonce)
                .map_err(|_| AccessError::Session)?;
            if let Some(expected) = claims.access_token_hash() {
                let actual = AccessTokenHash::from_token(
                    response.access_token(),
                    token.signing_alg().map_err(|_| AccessError::Session)?,
                    token
                        .signing_key(&verifier)
                        .map_err(|_| AccessError::Session)?,
                )
                .map_err(|_| AccessError::Session)?;
                if &actual != expected {
                    return Err(AccessError::Session);
                }
            }
            if claims.issuer() != &self.issuer || claims.subject().as_str().is_empty() {
                return Err(AccessError::Session);
            }
            if pending.expires_at <= now_ms() {
                return Err(AccessError::Session);
            }
            let token = authority
                .sign_in_verified(
                    claims.issuer().as_str(),
                    claims.subject().as_str(),
                    previous,
                )
                .await?;
            Ok(LoginCompletion {
                token,
                invitation: pending.invitation,
                deadline: until,
                expires_at: pending.expires_at,
            })
        };
        tokio::time::timeout_at(until, complete)
            .await
            .map_err(|_| AccessError::Session)?
    }
}
