declare module "@aws-sdk/client-dynamodb" {
  export class DynamoDBClient {
    constructor(config: Record<string, unknown>);
    send(command: PutItemCommand): Promise<unknown>;
  }
  export class PutItemCommand {
    constructor(input: Record<string, unknown>);
  }
}
