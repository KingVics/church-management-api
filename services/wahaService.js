const axios = require('axios');

class WahaService {
  constructor() {
    this.baseURL = process.env.WAHA_API_URL || 'http://localhost:3000';
    this.apiKey = process.env.WAHA_API_KEY || '';
    this.session = process.env.WAHA_SESSION || 'default';
    this.defaultCountryCode = String(
      process.env.WAHA_DEFAULT_COUNTRY_CODE || '234'
    );
    this.enforceActiveSession =
      String(process.env.WAHA_ENFORCE_ACTIVE_SESSION || 'true').toLowerCase() !==
      'false';

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Api-Key': this.apiKey,
      },
      timeout: 30000,
    });
  }

  formatChatId(phone) {
    let cleaned = String(phone || '').replace(/[^\d]/g, '');
    if (!cleaned) return '';

    // Keep already-suffixed ids untouched.
    if (String(phone).endsWith('@c.us')) return String(phone);

    // Convert local 0XXXXXXXXXX numbers to country format (default: 234XXXXXXXXXX).
    if (cleaned.startsWith('0') && cleaned.length >= 10) {
      cleaned = `${this.defaultCountryCode}${cleaned.slice(1)}`;
    }

    // Also handle short local numbers missing country code.
    if (
      cleaned.length <= 11 &&
      !cleaned.startsWith(this.defaultCountryCode)
    ) {
      cleaned = `${this.defaultCountryCode}${cleaned.replace(/^0+/, '')}`;
    }

    return `${cleaned}@c.us`;
  }

  _sessionStatusUpper(raw) {
    return String(raw?.status || raw?.state || raw?.session?.status || '').toUpperCase();
  }

  _isSessionActive(raw) {
    const status = this._sessionStatusUpper(raw);
    return ['WORKING', 'CONNECTED', 'RUNNING', 'STARTED', 'READY'].includes(
      status
    );
  }

  _extractMessageId(payload) {
    const rawId = payload?.id;
    if (!rawId) return null;
    if (typeof rawId === 'string') return rawId;
    if (typeof rawId === 'object') {
      return rawId._serialized || rawId.id || null;
    }
    return String(rawId);
  }

  _normalizeSendResponse(payload) {
    return {
      ...payload,
      messageId: this._extractMessageId(payload),
    };
  }

  async sendText(phone, text) {
    try {
      if (this.enforceActiveSession) {
        const session = await this.getSessionStatus();
        if (!this._isSessionActive(session)) {
          return {
            success: false,
            error: {
              code: 'SESSION_NOT_ACTIVE',
              message:
                'WAHA session is not active. Start/restart session and scan QR before sending.',
              sessionStatus: this._sessionStatusUpper(session) || 'UNKNOWN',
              session,
            },
          };
        }
      }

      const chatId = this.formatChatId(phone);
      if (!chatId) {
        return { success: false, error: 'Invalid phone number' };
      }
      const response = await this.client.post('/api/sendText', {
        session: this.session,
        chatId,
        text,
      });
      return { success: true, data: this._normalizeSendResponse(response.data) };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  async sendImage(phone, imageUrl, caption = '') {
    try {
      if (this.enforceActiveSession) {
        const session = await this.getSessionStatus();
        if (!this._isSessionActive(session)) {
          return {
            success: false,
            error: {
              code: 'SESSION_NOT_ACTIVE',
              message:
                'WAHA session is not active. Start/restart session and scan QR before sending.',
              sessionStatus: this._sessionStatusUpper(session) || 'UNKNOWN',
              session,
            },
          };
        }
      }

      const chatId = this.formatChatId(phone);
      if (!chatId) {
        return { success: false, error: 'Invalid phone number' };
      }

      const response = await this.client.post('/api/sendImage', {
        session: this.session,
        chatId,
        file: {
          mimetype: 'image/jpeg',
          url: imageUrl,
        },
        caption,
      });
      return { success: true, data: this._normalizeSendResponse(response.data) };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  async getSessionStatus() {
    try {
      const response = await this.client.get(`/api/sessions/${this.session}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getServerStatus() {
    try {
      const response = await this.client.get('/api/server/status');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  async createSession(webhookUrl, sessionName = this.session) {
    try {
      console.log(webhookUrl, 'webhookurl3');
      let payload = { name: sessionName };
      if (webhookUrl) {
        console.log(webhookUrl, 'webhookurl4');
        payload.config = {
          webhooks: [{ url: webhookUrl, events: ['message', 'message.ack'] }],
        };
      }
      const response = await this.client.post('/api/sessions/', payload);
      return { success: true, data: response.data };
    } catch (error) {
      const statusCode = error.response?.status;
      const message =
        error.response?.data?.message || error.response?.data?.error || '';
      const duplicate =
        statusCode === 409 ||
        String(message).toLowerCase().includes('already') ||
        String(message).toLowerCase().includes('exist');
      if (duplicate) {
        return { success: true, data: { alreadyExists: true } };
      }
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async startOrCreateSession({
    sessionName = this.session,
    webhookUrl = null,
    retries = 3,
  } = {}) {
    console.log(webhookUrl, 'webhookurl2');
    // 1) Try create (idempotent in our wrapper).
    const created = await this.createSession(webhookUrl, sessionName);
    if (!created.success) {
      return created;
    }

    // 2) Try start with retries (session creation can be eventual).
    for (let attempt = 0; attempt < retries; attempt++) {
      const started = await this.startSession(sessionName);
      if (started.success) {
        return started;
      }

      const isNotFound =
        started?.error?.statusCode === 404 ||
        String(started?.error?.message || '')
          .toLowerCase()
          .includes('session not found');

      if (!isNotFound) {
        return started;
      }

      await this._wait(500 * (attempt + 1));
    }

    // 3) Fallback to deprecated WAHA endpoint that creates + starts in one call.
    try {
      const payload = {
        name: sessionName,
      };
      if (webhookUrl) {
        payload.config = {
          webhooks: [{ url: webhookUrl, events: ['message', 'message.ack'] }],
        };
      }

      const response = await this.client.post('/api/sessions/start', payload);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  async bootstrapDefaultSession({
    sessionName = this.session,
    webhookUrl = null,
  } = {}) {
    console.log(webhookUrl, 'webhookurl');
    // 1) Check WAHA node health.
    const serverStatus = await this.getServerStatus();
    if (!serverStatus.success) {
      return {
        success: false,
        error: {
          code: 'WAHA_UNAVAILABLE',
          message:
            'WAHA server is unavailable. Ensure WAHA container/worker is running and reachable.',
          details: serverStatus.error,
        },
      };
    }

    // 2) Create/start session (resilient flow).
    const result = await this.startOrCreateSession({
      sessionName,
      webhookUrl,
      retries: 4,
    });
    if (!result.success) {
      return result;
    }

    const session = await this.getSessionStatus();
    return {
      success: true,
      data: {
        started: true,
        session,
      },
    };
  }

  async startSession(sessionName = this.session) {
    try {
      const response = await this.client.post(
        `/api/sessions/${sessionName}/start`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  async stopSession(sessionName = this.session) {
    try {
      const response = await this.client.post(`/api/sessions/${sessionName}/stop`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  async restartSession(sessionName = this.session) {
    try {
      const response = await this.client.post(
        `/api/sessions/${sessionName}/restart`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  async logoutSession(sessionName = this.session) {
    try {
      const response = await this.client.post('/api/sessions/logout', {
        name: sessionName,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  async getQr(sessionName = this.session, format = 'image') {
    try {
      const response = await this.client.get(`/api/${sessionName}/auth/qr`, {
        params: format ? { format } : undefined,
        headers: {
          Accept: 'application/json',
        },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }
}

module.exports = new WahaService();
