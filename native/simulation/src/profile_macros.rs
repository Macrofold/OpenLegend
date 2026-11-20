// These macros keep the stock build's expression (and its temporary drop
// scope) intact. Arguments used only for observation are absent in that build.

#[doc(hidden)]
#[macro_export]
#[cfg(feature = "profile-campaign")]
macro_rules! profile_scope {
    ($site:ident) => {
        $crate::profile::sync($crate::profile::sites::$site)
    };
}

#[doc(hidden)]
#[macro_export]
#[cfg(not(feature = "profile-campaign"))]
macro_rules! profile_scope {
    ($site:ident) => {
        ()
    };
}

#[doc(hidden)]
#[macro_export]
#[cfg(feature = "profile-campaign")]
macro_rules! profile_measure {
    ($site:ident, $future:expr) => {
        $crate::profile::observe($crate::profile::sites::$site, $future)
    };
    ($site:ident, $future:expr, $outcome:expr) => {
        $crate::profile::observe_with($crate::profile::sites::$site, $future, $outcome)
    };
}

#[doc(hidden)]
#[macro_export]
#[cfg(not(feature = "profile-campaign"))]
macro_rules! profile_measure {
    ($site:ident, $future:expr $(, $outcome:expr)?) => {
        $future
    };
}

#[doc(hidden)]
#[macro_export]
#[cfg(feature = "profile-campaign")]
macro_rules! profile_count {
    ($site:ident, $amount:expr) => {
        if $crate::profile::selected($crate::profile::sites::$site) {
            $crate::profile::count($crate::profile::sites::$site, $amount);
        }
    };
}

#[doc(hidden)]
#[macro_export]
#[cfg(not(feature = "profile-campaign"))]
macro_rules! profile_count {
    ($site:ident, $amount:expr) => {};
}

#[doc(hidden)]
#[macro_export]
#[cfg(feature = "profile-campaign")]
macro_rules! profile_body {
    ($site:ident, $body:block) => {
        $crate::profile_result!($site, async $body).await
    };
    ($site:ident, $body:block, $outcome:expr) => {
        $crate::profile_measure!($site, async $body, $outcome).await
    };
}

#[doc(hidden)]
#[macro_export]
#[cfg(not(feature = "profile-campaign"))]
macro_rules! profile_body {
    ($site:ident, $body:block $(, $outcome:expr)?) => {
        $body
    };
}

#[doc(hidden)]
#[macro_export]
macro_rules! profile_result {
    ($site:ident, $future:expr) => {
        $crate::profile_measure!($site, $future, |result: &Result<_, _>| {
            if result.is_ok() {
                $crate::profile::Outcome::Completed
            } else {
                $crate::profile::Outcome::Failed
            }
        })
    };
}

#[doc(hidden)]
#[macro_export]
#[cfg(feature = "profile-campaign")]
macro_rules! profile_call {
    ($site:ident, $body:block, $outcome:expr) => {{
        let mut observation = $crate::profile_scope!($site);
        // Return and ? resolve the observed invocation before recording its
        // outcome. The caller still owns the returned value and effects.
        let result = (|| $body)();
        if observation.is_observed() {
            observation.outcome(($outcome)(&result));
        }
        result
    }};
}

#[doc(hidden)]
#[macro_export]
#[cfg(not(feature = "profile-campaign"))]
macro_rules! profile_call {
    ($site:ident, $body:block, $outcome:expr) => {
        $body
    };
}
