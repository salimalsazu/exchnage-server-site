const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
console.log(stripe);
//cors
app.use(cors());
//middleware
app.use(express.json());


//homepage
app.get('/', (req, res) => {
    res.send('Welcome to webhost Server')
})


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    const token = authHeader.split(' ')[1]

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }

        req.decoded = decoded;
        next();
    })

}









//mongoDB 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gfar9jj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// console.log(client);

async function run() {

    try {
        const usersCollection = client.db('exchange').collection('users');
        const productCollection = client.db('exchange').collection('products');
        const categoriesCollection = client.db('exchange').collection('categories');
        const bookingsCollection = client.db('exchange').collection('bookings');
        const paymentsCollection = client.db('exchange').collection('payments');
        const wishListCollection = client.db('exchange').collection('wishList');
        const adsCollection = client.db('exchange').collection('ads');

        //verify admin 
        const verifyAdmin = async (req, res, next) => {
            console.log('inside of verifyAdmin', req.decoded.email);
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'Admin') {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        };


        //All Admin
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const query = { role: 'Admin' }
            const cursor = await usersCollection.find(query).toArray();
            res.send(cursor);
        })





        //Category
        app.get('/category/:category', async (req, res) => {
            const category = (req.params.category);

            const query = { category }

            const categories = await productCollection.find(query).toArray();
            res.send(categories);

        })


        app.get('/categories', async (req, res) => {
            const query = {}
            const cursur = await categoriesCollection.find(query).toArray();
            res.send(cursur);
        })


        //category wise product
        app.get('/products/:categoryid', async (req, res) => {
            const categoryid = req.params.categoryid;
            const query = { categoryid }
            const product = await productCollection.find(query).toArray();
            res.send(product);
        })

        app.get('/allproducts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const product = await productCollection.findOne(query);
            res.send(product);
        })


        //delete product
        app.delete("/allproducts/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })

        app.delete("/users/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        app.get('/products', verifyJWT, async (req, res) => {

            const decoded = req.decoded;
            console.log('inside review', decoded)

            if (decoded.email !== req.query?.email) {
                return res.status(403).send({ message: 'unauthorized access' })
            }
            let query = {};

            if (req.query?.email) {
                query = {
                    email: req.query?.email
                }
            }
            console.log(query);
            const cursor = productCollection.find(query);
            const service = await cursor.toArray();
            res.send(service);

        })


        //order collection 
        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const booking = await bookingsCollection.findOne(query);
            res.send(booking);
        })

        app.get('/bookings', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            console.log('inside review', decoded)

            if (decoded.email !== req.query?.email) {
                return res.status(403).send({ message: 'unauthorized access' })
            }
            let query = {};

            if (req.query?.email) {
                query = {
                    email: req.query?.email
                }
            }
            const cursor = await bookingsCollection.find(query).toArray();
            res.send(cursor);
        })

        app.get('/wishlist', async (req, res) => {
            const query = {}
            const cursor = await wishListCollection.find(query).toArray();
            res.send(cursor);
        })

        //ads section 
        app.get('/ads', async (req, res) => {
            const query = {}
            const cursor = await adsCollection.find(query).toArray();
            res.send(cursor);
        })

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' })
            res.send({ token })
        })

        //posting user 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'Admin' })
        })


        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'Seller' })
        })

        app.get('/users/seller', async (req, res) => {
            const query = { role: "Seller" }
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/users/buyer', async (req, res) => {
            const query = { role: "Buyer" }
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })

        app.put('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {

            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const upddatedDoc = {
                $set: {
                    role: 'Admin'
                }
            }
            const result = await usersCollection.updateOne(filter, upddatedDoc, options);
            res.send(result);
        })

        app.put('/users/seller/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const upddatedDoc = {
                $set: {
                    status: 'Verified'
                }
            }
            const result = await usersCollection.updateOne(filter, upddatedDoc, options);
            res.send(result);
        })

        app.put('/users/verifyseller/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const options = { upsert: true }
            const upddatedDoc = {
                $set: {
                    status: 'Verified'
                }
            }
            const result = await productCollection.updateMany(filter, upddatedDoc, options);
            res.send(result);
        })

        //post categoris 
        app.post('/categories', async (req, res) => {
            const category = req.body;
            const result = await categoriesCollection.insertOne(category);
            res.send(result);
        })

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

        //wishlist 

        app.post('/wishlist', async (req, res) => {
            const wishlist = req.body;
            const result = await wishListCollection.insertOne(wishlist);
            res.send(result);
        })

        app.post('/ads', async (req, res) => {
            const ad = req.body;
            const result = await adsCollection.insertOne(ad);
            res.send(result);
        })


        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })


        //peyment collection 
        app.put('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.paymentId;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transectionId: payment.transectionId,
                    availability: true
                }
            }

            const productid = payment.bookingid;
            const productfilter = { _id: ObjectId(productid) }

            const updatesDoc = {
                $set: {
                    paid: true,
                    transectionId: payment.transectionId,
                    availability: true
                }
            }

            const adId = payment.bookingid;
            const adfilter = { bookingid: adId }

            const updatesAdDoc = {
                $set: {
                    paid: true,
                    transectionId: payment.transectionId,
                    availability: true
                }
            }




            const updateResult = await bookingsCollection.updateOne(filter, updatedDoc, options)
            const updatesResult = await productCollection.updateOne(productfilter, updatesDoc, options)
            const adsResult = await adsCollection.updateOne(adfilter, updatesAdDoc, options)
            res.send({ result, updateResult, updatesResult, adsResult });
        })




    }
    finally {

    }

}
run().catch((err) => console.error(err))














app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})