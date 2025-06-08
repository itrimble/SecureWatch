export interface KQLEngine {
  execute(query: string): Promise<any>;
  parse(query: string): any;
}

export class KQLParser {
  constructor();
  parse(query: string): any;
}

export class KQLToOpenSearchTranslator {
  constructor();
  translate(ast: any): any;
}