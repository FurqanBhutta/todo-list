import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Load .env variables

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const dbURI = process.env.MONGO_URI;

async function main() {
    try {
        await mongoose.connect(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("✅ MongoDB Connected Successfully!");

        app.listen(3000, () => {
            console.log("🚀 Server running on port 3000");
        });

    } catch (err) {
        console.error("❌ MongoDB Connection Failed!", err);
    }
}

main(); // Call main function to connect to DB

// Schema Definitions
const itemSchema = new mongoose.Schema({
    name: String
});
const Item = mongoose.model("Item", itemSchema);

const listSchema = new mongoose.Schema({
    name: String,
    items: [itemSchema]
});
const List = mongoose.model("List", listSchema);

const defaultItems = [
    new Item({ name: "Buy Food" }),
    new Item({ name: "Cook Food" }),
    new Item({ name: "Eat Food" })
];

// Helper Functions
async function insertItems(arr) {
    try {
        const existingItems = await Item.find();
        if (existingItems.length === 0) {
            await Item.insertMany(arr);
            console.log("✅ Default items inserted!");
        }
    } catch (err) {
        console.error("❌ Error inserting items:", err);
    }
}

async function getItems() {
    try {
        return await Item.find();
    } catch (err) {
        console.error("❌ Error fetching items:", err);
        return [];
    }
}

async function deleteItem(listName, id) {
    try {
        if (listName === "Today") {
            await Item.deleteOne({ _id: id });
        } else {
            await List.updateOne({ name: listName }, { $pull: { items: { _id: id } } });
        }
        console.log(`✅ ${id} deleted successfully!`);
    } catch (err) {
        console.error("❌ Error deleting item:", err);
    }
}

// EJS View Engine
app.set("view engine", "ejs");

// Routes
app.get("/", async (req, res) => {
    try {
        const items = await getItems();
        if (items.length === 0) {
            await insertItems(defaultItems);
            res.redirect("/");
        } else {
            res.render("list", { listName: "Today", newItems: items });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.get("/:customListName", async (req, res) => {
    const cl = req.params.customListName;
    const customListName = `${cl.charAt(0).toUpperCase()}${cl.slice(1).toLowerCase()}`;

    try {
        const foundList = await List.findOne({ name: customListName });
        if (!foundList) {
            const myList = new List({
                name: customListName,
                items: defaultItems
            });
            await myList.save();
            res.redirect("/" + customListName);
        } else {
            res.render("list", { listName: foundList.name, newItems: foundList.items });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.post("/", async (req, res) => {
    const item = req.body.item;
    const listName = req.body.listName;

    const myItem = new Item({ name: item });

    try {
        if (listName === "Today") {
            await myItem.save();
            res.redirect("/");
        } else {
            await List.updateOne({ name: listName }, { $push: { items: myItem } });
            res.redirect("/" + listName);
        }
    } catch (err) {
        console.error("❌ Error saving item:", err);
        res.status(500).send("Server error");
    }
});

app.post("/delete", async (req, res) => {
    const itemId = req.body.checkbox;
    const listName = req.body.listName;

    await deleteItem(listName, itemId);
    res.redirect("/" + listName);
});

app.get("/work", (req, res) => {
    res.render("list", { listName: "Work List", newItems: [], listType: "work" });
});

app.get("/about", (req, res) => {
    res.render("about");
});
