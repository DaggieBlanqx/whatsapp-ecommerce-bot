'use strict';
const router = require('express').Router();

// const WhatsappCloudAPI = require('whatsappcloudapi_wrapper');
const WhatsappCloudAPI = require('./../../whatsappcloudapi/index.js');
const Whatsapp = new WhatsappCloudAPI({
    accessToken: process.env.Meta_WA_accessToken,
    senderPhoneNumberId: process.env.Meta_WA_SenderPhoneNumberId,
    WABA_ID: process.env.Meta_WA_wabaId,
});

const EcommerceStore = require('./../controllers/ecommerce_store.js');
let DataStore = new Map();

router.get('/meta_wa_callbackurl', (req, res) => {
    console.log('GET:Someone is pinging me!');

    // Parse params from the webhook verification request
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (
        mode &&
        token &&
        mode === 'subscribe' &&
        process.env.Meta_WA_VerifyToken === token
    ) {
        // Respond with the challenge token from the request
        return res.status(200).send(challenge);
    } else {
        return res.sendStatus(403);
    }
});

router.post('/meta_wa_callbackurl', async (req, res) => {
    console.log('POST: Someone is pinging me!');

    // return res.status(200).send('OK'); //BMI
    let Store = new EcommerceStore();

    try {
        let data = Whatsapp.parseMessage(req.body);

        if (data && !data.isNotificationMessage) {
            let recipientNumber = data.message.from; // extract the phone number from the webhook payload
            let typeOfMsg = data.msgType;
            let message_id = data.message.id;
            let nameOfSender = data.contacts.profile.name;

            if (!DataStore.get(recipientNumber)) {
                DataStore.set(recipientNumber, {
                    name: nameOfSender,
                    phoneNumber: recipientNumber,
                    cart: [],
                });
            }
            let sample_contact = {
                addresses: [
                    {
                        street: '1 Hacker Way',
                        city: 'Menlo Park',
                        state: 'CA',
                        zip: '94025',
                        country: 'United States',
                        country_code: 'us',
                        type: 'HOME',
                    },
                    {
                        street: '200 Jefferson Dr',
                        city: 'Menlo Park',
                        state: 'CA',
                        zip: '94025',
                        country: 'United States',
                        country_code: 'us',
                        type: 'WORK',
                    },
                ],
                birthday: '2012-08-18',
                emails: [
                    {
                        // email: 'test@fb.com',
                        type: 'WORK',
                    },
                    {
                        email: 'test@whatsapp.com',
                        type: 'HOME',
                    },
                ],
                name: {
                    // formatted_name: 'John Smith',
                    first_name: 'Daggie',
                    last_name: 'Blanqx',
                    // middle_name: 'D.',
                    // suffix: 'Jr',
                    // prefix: 'Dr',
                },
                org: {
                    company: 'WhatsApp',
                    department: 'Design',
                    title: 'Manager',
                },
                phones: [
                    {
                        phone: '+1 (940) 555-1234',
                        type: 'HOME',
                    },
                    {
                        // phone: '+1 (650) 555-1234',
                        type: 'WORK',
                        wa_id: '16505551234',
                    },
                ],
                urls: [
                    {
                        url: 'https://www.facebook.com',
                        type: 'WORK',
                    },
                    {
                        url: 'https://www.whatsapp.com',
                        type: 'HOME',
                    },
                ],
            };
            await Whatsapp.sendContact({
                recipientNumber: recipientNumber,
                contact_profile: sample_contact,
            });

            return res.status(200).send('OK');

            let addToCart = async ({ product_id, recipientNumber }) => {
                let raw_product = await Store.getProductById(product_id);
                if (raw_product.status === 'success') {
                    let product = raw_product.data;
                    let item = new Map();
                    item.set(product_id, product);
                    DataStore.get(recipientNumber).cart.push(item);
                }
            };
            let listOfItemsCart = ({ recipientNumber }) => {
                return DataStore.get(recipientNumber).cart.map((item) => {
                    let product = item.get(item.keys().next().value);
                    return product;
                });
            };
            let clearCart = ({ recipientNumber }) => {
                DataStore.get(recipientNumber).cart = [];
            };

            let getCartTotal = async ({ recipientNumber }) => {
                let total = 0;
                let products = listOfItemsCart({ recipientNumber });
                for (let product of products) {
                    total += product.price;
                }
                return { total, products, numberOfItems: products.length };
            };

            await Whatsapp.markMessageAsRead({
                message_id,
            });

            if (typeOfMsg === 'textMessage') {
                await Whatsapp.sendButtons({
                    message: `Hey ${nameOfSender}, \nYou are speaking to a chatbot.\nWhat do you want to do next?`,
                    recipientNumber: recipientNumber,
                    message_id,
                    listOfButtons: [
                        {
                            title: 'View some products',
                            id: 'see_categories',
                        },
                        {
                            title: 'Speak to a human',
                            id: 'speak_to_human',
                        },
                    ],
                });
            }

            if (typeOfMsg === 'listMessage') {
                // which product is the user interested in?
                // Respond with an image of the product and a button to buy it directly from the chatbot
                let selectedRadioBtn = data.message.list_reply;

                let selectionId = selectedRadioBtn.id;

                if (selectionId.startsWith('prod_')) {
                    let trackable_id = selectedRadioBtn?.id.split('_');
                    let [prod_, item_id, item_category, userAccount] =
                        trackable_id;

                    console.log({
                        prod_,
                        item_id,
                        item_category,
                        userAccount,
                    });

                    // get product from store
                    let product = await Store.getProductById(item_id);
                    if (product.status !== 'success') {
                        await Whatsapp.sendText({
                            message: `Sorry, I could not get the product.`,
                            recipientNumber: recipientNumber,
                            message_id,
                        });
                    }

                    let product_id = product.data.id;
                    let price = product.data.price;
                    let title = product.data.title?.trim();
                    let description = product.data.description?.trim();
                    let category = product.data.category?.trim();
                    let imageUrl = product.data.image;
                    let rating = product.data.rating;
                    let emojiRating = (rating) => {
                        // generate as many emojis as are rating
                        rating = Math.floor(rating || 0);
                        let emojiIcon = '⭐';
                        let output = [];
                        for (var i = 0; i < rating; i++) output.push(emojiIcon);
                        return output.join('');
                    };
                    let text = `_Title_: *${title}*\n\n\n`;
                    text += `_Description_: ${description}\n\n\n`;
                    text += `_Price_: $${price}\n`;
                    text += `_Category_: ${category}\n`;
                    text += `_Rated_: ${emojiRating(rating?.rate)}\n\n`;
                    text += `${
                        rating?.count || 0
                    } shoppers liked this product.`;

                    await Whatsapp.sendImage({
                        recipientNumber,
                        url: imageUrl,
                        message: text,
                    });

                    await Whatsapp.sendButtons({
                        message: `Here is the product, what do you want to do next?`,
                        recipientNumber: recipientNumber,
                        message_id,
                        listOfButtons: [
                            {
                                title: 'Add to cart🛒',
                                id: `add_to_cart_${product_id}`,
                            },
                            {
                                title: 'Speak to a human',
                                id: 'speak_to_human',
                            },
                            {
                                title: 'See more products',
                                id: 'see_categories',
                            },
                        ],
                    });
                }
            }

            if (typeOfMsg === 'replyButtonMessage') {
                let selectedButton = data.message.button_reply;
                let button_id = selectedButton?.id;

                if (button_id === 'speak_to_human') {
                    // respond with a list of human resources
                    await Whatsapp.sendText({
                        recipientNumber: recipientNumber,
                        message: `Not to brag, but unlike humans, chatbots are super fast⚡, we never sleep, never rest, never take lunch🍽 and can multitask.\n\nAnway don't fret, a hoooooman will 📞contact you soon.\n\nWanna blast☎ his/her phone😈?\nHere are the contact details:`,
                    });

                    await Whatsapp.sendContact({
                        recipientNumber: recipientNumber,
                    });
                }
                if (button_id === 'see_categories') {
                    let categories = await Store.getAllCategories();
                    if (categories.status !== 'success') {
                        await Whatsapp.sendText({
                            message: `Sorry, I could not get the categories.`,
                            recipientNumber: recipientNumber,
                            message_id,
                        });
                    }

                    let listOfButtons = categories.data
                        .slice(0, 3)
                        .map((category) => {
                            return {
                                title: category,
                                id: `category_${category}`,
                            };
                        });

                    await Whatsapp.sendButtons({
                        message: `We have several categories.\nChoose one of them.`,
                        recipientNumber: recipientNumber,
                        message_id,
                        listOfButtons: listOfButtons,
                    });
                }

                if (button_id.startsWith('category_')) {
                    let specificCategory = button_id.split('category_')[1];
                    // respond with a list of products
                    let listOfProducts = await Store.getProductsInCategory(
                        specificCategory
                    );

                    if (listOfProducts.status !== 'success') {
                        await Whatsapp.sendText({
                            message: `Sorry, I could not get the products.`,
                            recipientNumber: recipientNumber,
                            message_id,
                        });
                    }

                    let listOfSections = [
                        {
                            title: `🏆 Top 3: ${specificCategory}`.substring(
                                0,
                                24
                            ),
                            rows: listOfProducts.data
                                .map((product) => {
                                    let trackable_id = `prod_${product.id
                                        .toString()
                                        .substring(
                                            0,
                                            256
                                        )}_${specificCategory}_${recipientNumber}`;
                                    let title = (() =>
                                        `${product.title.substring(
                                            0,
                                            21
                                        )}...`)();
                                    let description = (() => {
                                        let price = product.price;
                                        let description = product.description;
                                        let output =
                                            `$${price}\n${description}`.substring(
                                                0,
                                                69
                                            );
                                        return `${output}...`;
                                    })();

                                    return {
                                        id: trackable_id,
                                        title,
                                        description,
                                    };
                                })
                                .slice(0, 10),
                        },
                    ];
                    await Whatsapp.sendList({
                        recipientNumber: recipientNumber,
                        headerText: `🫰🏿 #BlackFriday Offers: ${specificCategory}`,
                        bodyText: `\nWe have great products lined up for you based on your previous shopping history.\n\nSanta 🎅🏿 also made you a coupon code: *_${Math.floor(
                            Math.random() * 1234578
                        )}_*.\n\nPlease select one of the products below.`,
                        footerText: 'Powered by: BMI LLC',
                        listOfSections,
                    });
                }
                if (button_id.startsWith('add_to_cart_')) {
                    let product_id = button_id.split('add_to_cart_')[1];
                    await addToCart({ recipientNumber, product_id });
                    let numberOfItemsInCart = listOfItemsCart({
                        recipientNumber,
                    }).length;

                    await Whatsapp.sendButtons({
                        message: `Your cart has been updated.\nNumber of items in cart: ${numberOfItemsInCart}.\n\nWhat do you want to do next?`,
                        recipientNumber: recipientNumber,
                        message_id,
                        listOfButtons: [
                            {
                                title: 'Checkout 🛍️',
                                id: `checkout`,
                            },
                            {
                                title: 'See more products',
                                id: 'see_categories',
                            },
                        ],
                    });
                }
                if (button_id === 'checkout') {
                    // respond with a list of products
                    let finalBill = await getCartTotal({ recipientNumber });
                    let pdfInvoiceText = `\nDate: ${new Date().toLocaleDateString()}`;

                    let text = `\nDate: ${new Date().toLocaleDateString()}`;
                    text += `\nYou have ${finalBill.numberOfItems} items in your cart.\nYour cart contains:`;

                    finalBill.products.forEach((item, index) => {
                        text += `\n👉🏿 ${item.title} - $${item.price}`;
                        pdfInvoiceText += `\n#${index + 1}: ${item.title} - $${
                            item.price
                        }`;
                    });

                    text += `\n\nTotal: $${finalBill.total}`;
                    pdfInvoiceText += `\n\nTotal: $${finalBill.total}`;
                    text += `\n\nPlease select one of the following options:`;

                    Store.generateInvoice({
                        order_details: pdfInvoiceText,
                        file_path: `./invoice_${nameOfSender}.pdf`,
                    });

                    await Whatsapp.sendButtons({
                        message: text,
                        recipientNumber: recipientNumber,
                        message_id,
                        listOfButtons: [
                            {
                                title: 'Pay with cash',
                                id: 'pay_with_cash',
                            },
                            {
                                title: 'Pay later',
                                id: 'pay_later',
                            },
                        ],
                    });
                }
                if (
                    button_id === 'pay_with_cash' ||
                    button_id === 'pay_later'
                ) {
                    // respond with a list of products

                    await Whatsapp.sendButtons({
                        recipientNumber: recipientNumber,
                        message: `Thank you ${nameOfSender}.\n\nYour order has been received. It will be processed shortly. We will update you on the progress of your order via Whatsapp inbox.`,
                        message_id,
                        listOfButtons: [
                            {
                                title: 'See more products',
                                id: 'see_categories',
                            },
                            {
                                title: 'Print invoice',
                                id: 'print_invoice',
                            },
                        ],
                    });

                    clearCart({ recipientNumber });

                    setTimeout(async () => {
                        let place = Store.generateRandomGeoLocation();
                        await Whatsapp.sendText({
                            recipientNumber: recipientNumber,
                            message: `Your order has been fulfilled. Come and pick it up here:`,
                        });
                        await Whatsapp.sendLocation({
                            recipientNumber: recipientNumber,
                            latitude: place.latitude,
                            longitude: place.longitude,
                            name: 'Mom-N-Pop Shop',
                            address: place.address,
                        });
                    }, 5000);
                }
                if (button_id === 'print_invoice') {
                    // respond with a list of products
                    await Whatsapp.sendDocument({
                        recipientNumber: '254773841221',
                        file_name: `Invoice - #${nameOfSender}`,
                        file_path: `./invoice_${nameOfSender}.pdf`,
                    });
                }
            }
        }

        return res.sendStatus(200);
    } catch (error) {
        let msg = error?.error_data?.details;
        //     console.error({ error });
        if (msg && msg.includes('last-seen message in this conversation')) {
            return res.sendStatus(200);
        }
        return res.sendStatus(404);
    }
});

module.exports = router;
