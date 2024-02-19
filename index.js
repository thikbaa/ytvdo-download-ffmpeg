import express from "express";
import path from "path";

const __dirname = path.resolve();

const app = express();

app.use(express.json());

app.get("/", (req, res)=>{
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("searchByUrl/:url", (req, res)=>{
 res.send("worked")
  

})

app.get('/youtube-content', async (req, res) => {
    try {
        const response = await fetch('https://www.youtube.com/watch?v=dN89jjDQLCo&list=PPSV');
        const data = await response.text();
        res.send(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching YouTube content');
    }
});


app.listen(5000, ()=>{
    console.log("port listening on 5000");
});
