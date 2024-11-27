import { SQSHandler } from "aws-lambda";
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";
import { SESClient, SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";

if (!SES_EMAIL_TO || !SES_EMAIL_FROM || !SES_REGION) {
  throw new Error(
    "Please add the SES_EMAIL_TO, SES_EMAIL_FROM, and SES_REGION environment variables."
  );
}

interface ContactDetails {
    name: string;
    email: string;
    message: string;
  }

const client = new SESClient({ region: SES_REGION });


export const handler: SQSHandler = async (event) => {
  console.log("Event received: ", JSON.stringify(event));

  for (const record of event.Records) {
    try {
      const name = "The Photo Album";
      const email = SES_EMAIL_FROM; 
      const message = `Your upload was rejected because it is not a supported file type. Only .jpeg or .png files are allowed.`;

      const params = sendEmailParams({ name, email, message });
      await client.send(new SendEmailCommand(params));
      console.log(`Rejection email sent`);
    } catch (error) {
      console.log("Error handling DLQ message: ", error);
    }
  }
};

function sendEmailParams({ name, email, message }: ContactDetails){
  const parameters: SendEmailCommandInput = {
    Destination: {
      ToAddresses: [SES_EMAIL_TO],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: getHtmlContent({ name, email, message }),
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Image upload rejection",
      },
    },
    Source: SES_EMAIL_FROM,
  };

  return parameters;
}

function getHtmlContent({ name, email, message }: ContactDetails) {
    return `
      <html>
        <body>
          <h2>Sent from: </h2>
          <ul>
            <li style="font-size:18px">👤 <b>${name}</b></li>
            <li style="font-size:18px">✉️ <b>${email}</b></li>
          </ul>
          <p style="font-size:18px">${message}</p>
        </body>
      </html> 
    `;
  }
