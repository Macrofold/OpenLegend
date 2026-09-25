        try {
          if (this.running === run) {
            this.running = null;
            this.pending = null;
          }

          this.service.notify();
          this.pendingWork.delete(pending);
        }
      });
    this.pending = pending;
    this.pendingWork.add(pending);
  }

