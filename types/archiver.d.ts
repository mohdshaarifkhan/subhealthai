declare module "archiver" {
  import { Transform } from "stream";

  interface EntryData {
    name?: string;
  }

  interface ZipOptions {
    zlib?: { level?: number };
  }

  interface Archiver extends Transform {
    file(filename: string, data?: EntryData): void;
    append(source: any, data?: EntryData): void;
    finalize(): void;
    pipe(stream: NodeJS.WritableStream): NodeJS.WritableStream;
  }

  interface ArchiverModule {
    (format: "zip", options?: ZipOptions): Archiver;
  }

  const archiver: ArchiverModule;
  export = archiver;
}
