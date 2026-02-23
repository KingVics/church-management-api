const { exec } = require('child_process');

class InfrastructureService {
  _normalizeStartCommandForApi(command) {
    let normalized = String(command || '').trim();
    if (!normalized) return normalized;

    // API execution must be detached, not interactive.
    normalized = normalized.replace(/\s-it(\s|$)/g, ' -d$1');
    normalized = normalized.replace(/\s-ti(\s|$)/g, ' -d$1');
    normalized = normalized.replace(/\s-i(\s|$)/g, ' ');
    normalized = normalized.replace(/\s-t(\s|$)/g, ' ');

    // Keep container alive after API command exits.
    normalized = normalized.replace(/\s--rm(\s|$)/g, ' ');

    // Ensure sessions dir exists for the bind mount path in your command.
    if (
      normalized.includes('docker run') &&
      normalized.includes('/app/.sessions') &&
      !normalized.includes('mkdir -p')
    ) {
      normalized = `mkdir -p "$PWD/sessions" && ${normalized}`;
    }

    return normalized.replace(/\s+/g, ' ').trim();
  }

  _execCommand(command, timeoutMs = 120000) {
    const cwd = process.env.WAHA_INFRA_WORKDIR || process.cwd();
    return new Promise((resolve) => {
      exec(
        command,
        { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 5, cwd },
        (error, stdout, stderr) => {
          if (error) {
            return resolve({
              success: false,
              error: error.message,
              stdout: stdout || '',
              stderr: stderr || '',
              cwd,
            });
          }
          return resolve({
            success: true,
            stdout: stdout || '',
            stderr: stderr || '',
            cwd,
          });
        }
      );
    });
  }

  async getWahaInfrastructureStatus() {
    const cmd =
      process.env.WAHA_INFRA_STATUS_CMD ||
      'docker ps --filter "name=waha" --format "{{.Names}}|{{.Status}}|{{.Ports}}"';

    const result = await this._execCommand(cmd, 30000);
    if (!result.success) return result;

    const lines = result.stdout
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const workers = lines.map((line) => {
      const [name, status, ports] = line.split('|');
      return { name: name || '', status: status || '', ports: ports || '' };
    });

    return {
      success: true,
      workers,
      raw: result.stdout,
      stderr: result.stderr,
    };
  }

  async startWahaInfrastructure() {
    const cmd = process.env.WAHA_INFRA_START_CMD;
    if (!cmd) {
      return {
        success: false,
        error:
          'WAHA_INFRA_START_CMD is not configured. Set it to a safe docker start command.',
      };
    }
    const safeCmd = this._normalizeStartCommandForApi(cmd);
    return this._execCommand(safeCmd, 180000);
  }

  async stopWahaInfrastructure() {
    const cmd = process.env.WAHA_INFRA_STOP_CMD;
    if (!cmd) {
      return {
        success: false,
        error:
          'WAHA_INFRA_STOP_CMD is not configured. Set it to a safe docker stop command.',
      };
    }
    return this._execCommand(cmd, 120000);
  }
}

module.exports = new InfrastructureService();
