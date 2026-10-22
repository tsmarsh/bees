// The eleven WASI preview-1 calls a fibber library module imports, enough for a module that never touches files.
// Standard output and error go to the console; anything else answers "not supported" (errno 52, ENOSYS).
const ENOSYS = 52;

export function wasiImports(getMemory, log = console.log) {
  const view = () => new DataView(getMemory().buffer);
  const decoder = new TextDecoder();
  const pending = { 1: "", 2: "" };
  return {
    wasi_snapshot_preview1: {
      environ_sizes_get(countPtr, sizePtr) { view().setUint32(countPtr, 0, true); view().setUint32(sizePtr, 0, true); return 0; },
      environ_get() { return 0; },
      clock_time_get(_id, _precision, outPtr) {
        view().setBigUint64(outPtr, BigInt(Math.round(performance.now() * 1e6)), true);
        return 0;
      },
      fd_write(fd, iovs, iovsLen, writtenPtr) {
        const v = view();
        let written = 0;
        for (let i = 0; i < iovsLen; i++) {
          const ptr = v.getUint32(iovs + i * 8, true);
          const len = v.getUint32(iovs + i * 8 + 4, true);
          if (fd === 1 || fd === 2) pending[fd] += decoder.decode(new Uint8Array(getMemory().buffer, ptr, len));
          written += len;
        }
        v.setUint32(writtenPtr, written, true);
        for (const f of [1, 2]) {
          const lines = pending[f].split("\n");
          pending[f] = lines.pop();
          for (const line of lines) log(line);
        }
        return 0;
      },
      fd_fdstat_get(_fd, statPtr) { new Uint8Array(getMemory().buffer, statPtr, 24).fill(0); return 0; },
      fd_fdstat_set_flags() { return 0; },
      fd_close() { return 0; },
      fd_read() { return ENOSYS; },
      fd_seek() { return ENOSYS; },
      sched_yield() { return 0; },
      proc_exit(code) { throw new Error(`the simulation stopped (exit ${code})`); },
    },
  };
}
