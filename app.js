import express from 'express';
import bodyParser from 'body-parser';
import { mongoose, Schema } from 'mongoose';

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

main().catch(err => console.log(err));
async function main() {
  await mongoose.connect('mongodb://localhost:27017/todolist');
}

const itemSchema = new mongoose.Schema({
    name: String
})
const Item = mongoose.model("Item", itemSchema);

const item1 = new Item({
    name: "Buy Food"
})
const item2 = new Item({
    name: "Cook Food"
})
const item3 = new Item({
    name: "Eat Food"
})
const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
    name: String,
    items: [itemSchema]
})
const List = mongoose.model("List", listSchema);


async function insertItems(arr){
    try{
        const items = await Item.insertMany(arr);
        console.log(items);
    }catch (err){
        console.log(err)
    }
}

async function getItems(){
    try{
        return await Item.find();
    }catch(err){
        console.log(err);
        return [];
    }
}

async function deleteItem(listName, id){
    try{
        if(listName == "Today"){
            await Item.deleteOne({_id: id});
        }else{
            await List.updateOne({name: listName}, {$pull: {items: {_id: id}}} )
        }
        console.log(id + " is deleted!");
    }catch(err){
        console.log(err);
    }
}

app.set("view engine", "ejs");

app.get("/", (req,res)=>{
    getItems().then(items=>{ 
        if(items.length === 0){
            insertItems(defaultItems);
            res.redirect("/");
        }else{
            res.render("list", {listName : "Today", newItems : items});
        }
    })
})

app.get("/:customListName", async (req,res)=>{
    const cl = req.params.customListName;
    const customListName = `${cl.charAt(0).toUpperCase()}${cl.slice(1).toLowerCase()}`
    try{
        const foundList = await List.findOne({name: customListName});
        if(!foundList){
            const myList = new List({
                name: customListName,
                items: defaultItems
            })
            await myList.save();
            res.redirect("/"+ customListName);
        }else{
            res.render("list", {listName : foundList.name, newItems : foundList.items});
        }
    }catch(err){
        console.log(err);
    }
})

app.post("/", async (req,res)=>{
    const item = req.body.item;
    const listName = req.body.listName;
    const myItem = new Item({
        name: item
    })
    if(listName == "Today"){
        myItem.save();
        res.redirect("/");
    }else{
        await List.updateOne({name: listName}, {$push: {items: myItem} });
        res.redirect("/"+ listName);
    }
})

app.post("/delete", async (req,res)=>{
    const itemId = req.body.checkbox;
    const listName = req.body.listName;

    await deleteItem(listName, itemId);
    res.redirect("/" + listName);
})

app.get("/work", (req,res)=>{
    res.render("list", {listName: "Work List", newItems: workList, listType: "work"})
})

app.get("/about", (req,res)=>{
    res.render("about");
})

app.listen(3000, ()=>{
    console.log("port is listening at port 3000");
})