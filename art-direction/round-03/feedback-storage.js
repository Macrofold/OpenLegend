/* Bundled into index.html by build_board.py, so the board still opens as one file. */
(function (root) {
  'use strict';
  const ATLAS = 'Open Legend art atlas round 3';
  const object = value => value && typeof value === 'object' && !Array.isArray(value);

  function normalizePreferences(input) {
    if (!object(input)) throw new Error('This is not a round-three Open Legend feedback file. Choose feedback-round-03.json.');
    const result = {};
    for (const [id, entry] of Object.entries(input)) {
      if (!/^T\d{2}$/.test(id) || !object(entry) ||
          (entry.rating !== undefined && !['', 'like', 'maybe', 'pass'].includes(entry.rating)) ||
          (entry.note !== undefined && typeof entry.note !== 'string') ||
          (entry.aspects !== undefined && (!Array.isArray(entry.aspects) || !entry.aspects.every(x => typeof x === 'string')))) {
        throw new Error('This file has an invalid feedback entry. It has not been overwritten.');
      }
      result[id] = {rating: entry.rating || '', aspects: entry.aspects || [], note: entry.note || ''};
      if (entry.updatedAt && Number.isFinite(Date.parse(entry.updatedAt))) result[id].updatedAt = entry.updatedAt;
    }
    return result;
  }

  function readFeedback(text) {
    if (!text.trim()) return {};
    let data;
    try { data = JSON.parse(text); } catch (_) {
      throw new Error('This file is not valid feedback JSON. It has not been overwritten.');
    }
    if (!object(data) || data.atlas !== ATLAS) {
      throw new Error('This is not a round-three Open Legend feedback file. Choose feedback-round-03.json.');
    }
    return normalizePreferences(data.preferences);
  }

  function mergePreferences(disk, local) {
    const merged = {...disk};
    for (const [id, entry] of Object.entries(local)) {
      const existing = disk[id];
      // Older exports have no entry timestamps. Retain the current browser's entry
      // in an undated tie, while keeping every other reference already in the file.
      if (!existing || (Date.parse(entry.updatedAt) || 0) >= (Date.parse(existing.updatedAt) || 0)) merged[id] = entry;
    }
    return merged;
  }

  function createHandleStorage(indexedDB, key) {
    async function transaction(mode, operation) {
      if (!indexedDB) throw new Error('File selection cannot be remembered in this browser.');
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('open-legend-art-files', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('files');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Close another board tab and try again.'));
      });
      try {
        return await new Promise((resolve, reject) => {
          const tx = db.transaction('files', mode);
          const request = operation(tx.objectStore('files'));
          tx.oncomplete = () => resolve(request.result);
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error || new Error('File selection could not be remembered.'));
        });
      } finally { db.close(); }
    }
    return {
      load: () => transaction('readonly', store => store.get(key)),
      save: handle => transaction('readwrite', store => store.put(handle, key))
    };
  }

  class FeedbackStore {
    constructor(options) {
      this.preferences = normalizePreferences(options.preferences || {});
      this.pickFile = options.pickFile;
      this.handles = options.handles;
      this.persist = options.persist || (() => {});
      this.onPreferences = options.onPreferences || (() => {});
      this.onStatus = options.onStatus || (() => {});
      this.schedule = options.schedule || setTimeout;
      this.unschedule = options.unschedule || clearTimeout;
      this.now = options.now || (() => new Date().toISOString());
      this.handle = null;
      this.allowed = false;
      this.dirty = false;
      this.revision = 0;
      this.timer = null;
      this.writing = null;
      this.connecting = false;
      this.initializing = true;
      this.forgetful = false;
    }

    status(message, kind = 'info') {
      this.onStatus({message, kind, linked: !!this.handle, busy: this.initializing || this.connecting || !!this.writing});
    }

    notifyPreferences() {
      this.persist(this.preferences);
      this.onPreferences(this.preferences);
    }

    changed(id, entry) {
      this.preferences = {...this.preferences, ...normalizePreferences({[id]: {...entry, updatedAt: this.now()}})};
      this.revision++;
      this.dirty = true;
      this.notifyPreferences();
      if (this.allowed) {
        this.status('Changes pending · autosaving every 2 seconds');
        this.queue();
      } else if (this.handle) {
        this.status('Browser copy updated · click Save to resume file access');
      } else {
        this.status(this.pickFile ? 'Browser copy updated · click Save to choose feedback-round-03.json beside index.html' : 'Browser copy updated · direct file saving is unavailable here. Open this page in Chrome or Edge.');
      }
    }

    queue() {
      // Do not postpone an existing timer: continuous typing still saves every 2s.
      if (this.timer !== null || !this.allowed || !this.dirty) return;
      this.timer = this.schedule(() => { this.timer = null; void this.flush(); }, 2000);
    }

    async attach(handle) {
      const disk = readFeedback(await (await handle.getFile()).text());
      this.preferences = mergePreferences(disk, this.preferences);
      this.handle = handle;
      this.allowed = true;
      this.dirty = true;
      this.revision++;
      this.notifyPreferences();
    }

    async restore() {
      if (!this.pickFile) {
        this.initializing = false;
        this.status('Direct file saving is unavailable here. Open this page in Chrome or Edge; your browser copy remains available.');
        return;
      }
      try {
        const handle = await this.handles.load();
        if (handle) {
          this.handle = handle;
          if (await handle.queryPermission({mode: 'readwrite'}) === 'granted') {
            await this.attach(handle);
          }
        }
      } catch (error) {
        this.initializing = false;
        if (this.handle) {
          this.allowed = false;
          this.status('Could not reopen the feedback file: ' + error.message + ' Use Choose file to reconnect.', 'error');
          return;
        }
        this.forgetful = true;
      }
      this.initializing = false;
      if (this.allowed) await this.flush();
      else this.status(this.handle ? 'Feedback file remembered · click Save to allow access again' : 'Choose feedback-round-03.json beside index.html once; changes will then autosave every 2 seconds.');
    }

    async saveNow(chooseAnother = false) {
      if (this.initializing || this.connecting) return;
      if (!this.pickFile) {
        this.status('This browser cannot save directly to a chosen file. Open this page in Chrome or Edge, or use Download copy.', 'error');
        return;
      }
      if (this.writing) return this.writing;
      this.connecting = true;
      this.status('Connecting feedback file…');
      try {
        if (!this.handle || chooseAnother) {
          // Invoke the picker immediately inside the click's user activation.
          const handle = await this.pickFile({
            id: 'open-legend-feedback-round-03', suggestedName: 'feedback-round-03.json',
            types: [{description: 'Open Legend feedback', accept: {'application/json': ['.json']}}],
            excludeAcceptAllOption: true,
            ...(this.handle ? {startIn: this.handle} : {startIn: 'documents'})
          });
          await this.attach(handle);
          try { await this.handles.save(handle); this.forgetful = false; }
          catch (_) { this.forgetful = true; }
        } else {
          // Never request a permission from an autosave timer or page load.
          const permission = this.allowed ? 'granted' : await this.handle.requestPermission({mode: 'readwrite'});
          if (permission !== 'granted') {
            this.allowed = false;
            this.connecting = false;
            this.status('File access was not granted. Your browser copy is unchanged.', 'error');
            return;
          }
          if (!this.allowed) await this.attach(this.handle);
          this.allowed = true;
          this.dirty = true;
        }
      } catch (error) {
        this.connecting = false;
        this.status(error.name === 'AbortError' ? 'File selection canceled · your feedback is still kept in this browser' : error.message, error.name === 'AbortError' ? 'info' : 'error');
        this.queue();
        return;
      }
      this.connecting = false;
      return this.flush();
    }

    async flush() {
      if (this.writing) return this.writing;
      if (!this.handle || !this.allowed || !this.dirty || this.connecting) return;
      if (this.timer !== null) { this.unschedule(this.timer); this.timer = null; }
      const revision = this.revision;
      const payload = JSON.stringify({atlas: ATLAS, version: 2, savedAt: this.now(), preferences: this.preferences}, null, 2) + '\n';
      const job = (async () => {
        let writer;
        try {
          if (await this.handle.queryPermission({mode: 'readwrite'}) !== 'granted') {
            throw new Error('File access needs approval. Click Save to resume.');
          }
          writer = await this.handle.createWritable({mode: 'exclusive'});
          await writer.write(payload);
          await writer.close();
          this.dirty = this.revision !== revision;
        } catch (error) {
          if (writer) { try { await writer.abort(); } catch (_) {} }
          this.allowed = false;
          this.dirty = true;
          return 'File save failed: ' + error.message + ' Your feedback remains in this browser.';
        }
        return null;
      })();
      this.writing = job;
      this.status('Saving to ' + this.handle.name + '…');
      const error = await job;
      this.writing = null;
      if (error) this.status(error, 'error');
      else if (this.dirty) { this.status('More changes pending · autosaving in 2 seconds'); this.queue(); }
      else this.status('Saved to ' + this.handle.name + ' at ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'}) + ' · autosave on' + (this.forgetful ? ' · choose this file again when reopening' : ''), 'saved');
    }
  }

  const api = {FeedbackStore, createHandleStorage, readFeedback, mergePreferences};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ArtFeedbackStorage = api;
})(globalThis);
