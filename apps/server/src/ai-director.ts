        try {
          if (this.running === run) {
            this.running = null;
          }

          this.service.notify();
          this.pendingWork.delete(pending);
        }
      });
    this.pendingWork.add(pending);
  }

