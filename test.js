'use strict';
process.env = require('./.env.js')(process.env.NODE_ENV || 'development');
const fs = require('fs');
const WhatsappCloudAPI = require('./../whatsappcloudapi/index.js');
const Whatsapp = new WhatsappCloudAPI({
    accessToken: process.env.Meta_WA_accessToken,
    senderPhoneNumberId: process.env.Meta_WA_SenderPhoneNumberId,
    WABA_ID: process.env.Meta_WA_wabaId,
});

Whatsapp.sendDocument({
    recipientNumber: '254773841221',
    caption: 'Your invoice.',
    // url: 'http://pdfkit.org/demo/out.pdf',

    file_path: './output.pdf',
    file_name: 'Invoice #123',
})
    .then((output) => {
        console.log({ output });
    })
    .catch((err) => {
        console.log({ err });
    });

/*

Whatsapp._uploadMedia({
    file_path: './sample-image.jpg',
})
    .then((output) => {
        console.log({ output });
        let media_id = output.media_id;
        return media_id;
    })
    .then(async (media_id) => {
        let data = await Whatsapp._retrieveMediaUrl({
            media_id,
        });

        return data;
    })
    .then(async (media_data) => {
        let media_url = media_data.url;
        let data = await Whatsapp._downloadMediaViaUrl({
            media_url,
        });

        console.log({ data });
    })
    .catch((err) => {
        console.log({ err });
    });
*/

// Whatsapp.sendImage({
//     recipientNumber: '254773841221',
//     url: 'https://i.pravatar.cc/',
//     message: ` Hello World\nfrom daggie`,
// })
//     .then((output) => {
//         // console.log({ output });
//         let resp = output.response;
//         console.log({ resp });
//     })
//     .catch((err) => {
//         console.log({ err });
//     });
