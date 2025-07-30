import { IvsClient, CreateChannelCommand } from '@aws-sdk/client-ivs';
import { attemptAsync } from 'ts-utils/check';

export namespace IVS {
    export const client = new IvsClient({
        region: 'us-west-2',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        }
    });



    export const init = async () => {
        return attemptAsync(async () => {

        });
    };
}