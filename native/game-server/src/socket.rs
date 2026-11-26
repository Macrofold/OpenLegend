//! Bound time spent retaining a connection whose TCP peer stopped reading.
//! An idle SSE connection has no write deadline until it cannot drain.

use axum::serve::Listener as AxumListener;
use std::{
    future::Future,
    io::{self, IoSlice},
    net::SocketAddr,
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};
use tokio::{
    io::{AsyncRead, AsyncWrite, ReadBuf},
    net::{TcpListener, TcpStream},
    time::{Sleep, sleep},
};

const WRITE_STALL: Duration = Duration::from_secs(30);

pub(crate) struct Listener(pub TcpListener);

pub(crate) struct Connection {
    stream: TcpStream,
    stalled: Option<Pin<Box<Sleep>>>,
}

impl AxumListener for Listener {
    type Io = Connection;
    type Addr = SocketAddr;

    async fn accept(&mut self) -> (Connection, SocketAddr) {
        let (stream, client) = AxumListener::accept(&mut self.0).await;
        (
            Connection {
                stream,
                stalled: None,
            },
            client,
        )
    }

    fn local_addr(&self) -> io::Result<SocketAddr> {
        self.0.local_addr()
    }
}

impl Connection {
    fn writing<T>(
        &mut self,
        result: Poll<io::Result<T>>,
        context: &mut Context<'_>,
    ) -> Poll<io::Result<T>> {
        if result.is_ready() {
            self.stalled = None;
            return result;
        }
        let deadline = self
            .stalled
            .get_or_insert_with(|| Box::pin(sleep(WRITE_STALL)));
        if deadline.as_mut().poll(context).is_ready() {
            return Poll::Ready(Err(io::Error::new(
                io::ErrorKind::TimedOut,
                "The browser stopped receiving the response",
            )));
        }
        result
    }
}

impl AsyncRead for Connection {
    fn poll_read(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
        output: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        Pin::new(&mut self.stream).poll_read(context, output)
    }
}

impl AsyncWrite for Connection {
    fn poll_write(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
        bytes: &[u8],
    ) -> Poll<io::Result<usize>> {
        let result = Pin::new(&mut self.stream).poll_write(context, bytes);
        self.writing(result, context)
    }

    fn poll_write_vectored(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
        buffers: &[IoSlice<'_>],
    ) -> Poll<io::Result<usize>> {
        let result = Pin::new(&mut self.stream).poll_write_vectored(context, buffers);
        self.writing(result, context)
    }

    fn is_write_vectored(&self) -> bool {
        self.stream.is_write_vectored()
    }

    fn poll_flush(mut self: Pin<&mut Self>, context: &mut Context<'_>) -> Poll<io::Result<()>> {
        let result = Pin::new(&mut self.stream).poll_flush(context);
        self.writing(result, context)
    }

    fn poll_shutdown(mut self: Pin<&mut Self>, context: &mut Context<'_>) -> Poll<io::Result<()>> {
        Pin::new(&mut self.stream).poll_shutdown(context)
    }
}
