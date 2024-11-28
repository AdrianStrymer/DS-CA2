import { SNSHandler, SNSEvent } from "aws-lambda";
import {
  DynamoDBClient,
  UpdateItemCommand,
  UpdateItemCommandInput,
} from "@aws-sdk/client-dynamodb";

const dynamodb = new DynamoDBClient({});
const tableName = process.env.IMAGES_TABLE_NAME;

export const handler: SNSHandler = async (event: SNSEvent) => {
  console.log("Event: ", JSON.stringify(event));

  for (const record of event.Records) {
    const body = JSON.parse(record.Sns.Message); 
    const metadataType = record.Sns.MessageAttributes.metadata_type?.Value || ""; 

    const { id, value } = body; 

    if (!["Caption", "Date", "Photographer"].includes(metadataType)) {
      console.error(`Invalid metadata type: ${metadataType}`);
      continue;
    }

    try {
      const updateParams: UpdateItemCommandInput = {
        TableName: tableName,
        Key: { imageName: { S: id } }, 
        UpdateExpression: `SET ${metadataType.toLowerCase()} = :value`,
        ExpressionAttributeValues: {
          ":value": { S: value },
        },
      };

      await dynamodb.send(new UpdateItemCommand(updateParams));
      console.log(`Metadata updated successfully for image ID: ${id}`);
    } catch (error) {
      console.error(`Error updating metadata for image ID: ${id}`, error);
    }
  }
};