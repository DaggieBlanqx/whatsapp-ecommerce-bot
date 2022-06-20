'use strict';
const request = require('request');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const RandomGeoLocations = require('../controllers/geolocation_MOCK_DATA.json');

module.exports = class EcommerceStore {
    constructor() {
        this.baseUrl = 'https://fakestoreapi.com';
    }

    async getAllProducts() {}
    async getProductById(productId) {
        return new Promise((resolve, reject) => {
            request.get(
                `${this.baseUrl}/products/${productId}`,
                (err, res, body) => {
                    if (err) {
                        throw reject({
                            status: 'failed',
                            err,
                        });
                    } else {
                        try {
                            let product = JSON.parse(body);

                            let output = {
                                status: 'success',
                                data: product,
                            };

                            resolve(output);
                        } catch (err) {
                            throw reject({
                                status: 'failed',
                                err,
                            });
                        }
                    }
                }
            );
        });
    }
    async getAllCategories() {
        return new Promise((resolve, reject) => {
            request.get(
                `${this.baseUrl}/products/categories?limit=100`,
                (err, res, body) => {
                    if (err) {
                        throw reject({
                            status: 'failed',
                            err,
                        });
                    } else {
                        try {
                            let categories = JSON.parse(body);
                            // shuffle the categories
                            categories = categories.sort(
                                () => Math.random() - 0.5
                            );
                            // [1, 2, 3, 4].sort(() => (Math.random() > 0.5) ? 1 : -1)
                            console.log({
                                categories: categories.length,
                            });
                            resolve({
                                status: 'success',
                                data: categories,
                            });
                        } catch (err) {
                            throw reject({
                                status: 'failed',
                                err,
                            });
                        }
                    }
                }
            );
        });
    }
    async getProductsInCategory(categoryId) {
        return new Promise((resolve, reject) => {
            request.get(
                `${this.baseUrl}/products/category/${categoryId}?limit=10`,
                (err, res, body) => {
                    if (err) {
                        throw reject({
                            status: 'failed',
                            err,
                        });
                    } else {
                        try {
                            let products = JSON.parse(body);
                            // shuffle the products
                            products = products.sort(() =>
                                Math.random() > 0.5 ? 1 : -1
                            );
                            console.log({
                                products: products.length,
                            });
                            let output = {
                                status: 'success',
                                data: products,
                            };

                            resolve(output);
                        } catch (err) {
                            throw reject({
                                status: 'failed',
                                err,
                            });
                        }
                    }
                }
            );
        });
    }

    async generateInvoice({ order_details, file_path }) {
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(file_path));
        doc.fontSize(25).text(order_details, 100, 100);
        doc.end();
        return {
            status: 'success',
            data: {
                file_path,
            },
        };
    }

    generateRandomGeoLocation() {
        let oneLocation =
            RandomGeoLocations[
                Math.floor(Math.random() * RandomGeoLocations.length)
            ];
        return oneLocation;
    }
};
