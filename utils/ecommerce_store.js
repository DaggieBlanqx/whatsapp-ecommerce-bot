'use strict';
const request = require('request');
const PDFDocument = require('pdfkit');
const fs = require('fs');

module.exports = class EcommerceStore {
    constructor() {}
    async _fetchAssistant(endpoint) {
        return new Promise((resolve, reject) => {
            request.get(
                `https://fakestoreapi.com${endpoint ? endpoint : '/'}`,
                (error, res, body) => {
                    try {
                        if (error) {
                            reject(error);
                        } else {
                            resolve({
                                status: 'success',
                                data: JSON.parse(body),
                            });
                        }
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    async getProductById(productId) {
        return await this._fetchAssistant(`/products/${productId}`);
    }
    async getAllCategories() {
        return await this._fetchAssistant('/products/categories?limit=100');
    }
    async getProductsInCategory(categoryId) {
        return await this._fetchAssistant(
            `/products/category/${categoryId}?limit=10`
        );
    }

    generatePDFInvoice({ order_details, file_path }) {
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(file_path));
        doc.fontSize(25);
        doc.text(order_details, 100, 100);
        doc.end();
        return;
    }

    generateRandomGeoLocation() {
        let storeLocations = [
            {
                latitude: 44.985613,
                longitude: 20.1568773,
                address: 'New Castle',
            },
            {
                latitude: 36.929749,
                longitude: 98.480195,
                address: 'Glacier Hill',
            },
            {
                latitude: 28.91667,
                longitude: 30.85,
                address: 'Buena Vista',
            },
        ];
        return storeLocations[
            Math.floor(Math.random() * storeLocations.length)
        ];
    }
};
