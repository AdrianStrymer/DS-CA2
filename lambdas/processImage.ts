/* eslint-disable import/extensions, import/no-absolute-path */
import { SQSHandler } from "aws-lambda";
import { PutItemCommand, PutItemCommandInput, DeleteItemCommand, DeleteItemCommandInput } from "@aws-sdk/client-dynamodb";
import {
  GetObjectCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { extname } from "path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const s3 = new S3Client();
const dynamodb = new DynamoDBClient();
const imagesTableName = process.env.IMAGES_TABLE_NAME;

export const handler: SQSHandler = async (event) => {
  console.log("Event ", JSON.stringify(event));
  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body);        // Parse SQS message
    const snsMessage = JSON.parse(recordBody.Message); // Parse SNS message

    if (snsMessage.Records) {
      console.log("Record body ", JSON.stringify(snsMessage));
      for (const messageRecord of snsMessage.Records) {
        const s3e = messageRecord.s3;
        const eventType = messageRecord.eventName;
        const srcBucket = s3e.bucket.name;
        const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));
        const fileExtension = extname(srcKey).toLowerCase();
        if (eventType.startsWith("ObjectCreated")) {
        if (fileExtension !== ".jpeg" && fileExtension !== ".png") {
          const errorMsg= `File ${srcKey} is not a JPEG or PNG.`;
          console.log(errorMsg);

      
          throw new Error(
            JSON.stringify({
              errorMessage: errorMsg,
              fileName: srcKey,
            })
          );
        }
      

        try {
          const params: GetObjectCommandInput = {
            Bucket: srcBucket,
            Key: srcKey,
          };
          await s3.send(new GetObjectCommand(params));

          const putParams: PutItemCommandInput = {
            TableName: imagesTableName,
            Item: {
              imageName: { S: srcKey },
            },
          };
          await dynamodb.send(new PutItemCommand(putParams));
          console.log(`File ${srcKey} metadata saved to DynamoDB.`);
        } catch (error) {
          console.error(`Error processing file ${srcKey}:`, error);
        }
      } else if (eventType.startsWith("ObjectRemoved")) {
        try {
          const deleteParams: DeleteItemCommandInput = {
            TableName: imagesTableName,
            Key: {
              imageName: { S: srcKey },
            },
          };
          await dynamodb.send(new DeleteItemCommand(deleteParams));
          console.log(`Deleted metadata for file ${srcKey} from DynamoDB.`);
        } catch (error) {
          console.error(`Error deleting metadata for file ${srcKey}:`, error);
        }
      }
    }
    }
  }
};