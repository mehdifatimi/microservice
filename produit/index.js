const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());

const url = "mongodb://localhost:27017";
const dbName = "produits_service";
let db;

// Fonction pour se connecter à MongoDB
async function connectDB() {
  try {
    const client = await MongoClient.connect(url);
    console.log("✅ Connexion réussie avec Mongo");
    db = client.db(dbName);

    // Démarrer le serveur une fois la connexion établie
    const PORT = 4000;
    app.listen(PORT, () => {
      console.log(`🚀 Serveur en ligne : http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Erreur de connexion à MongoDB :", err);
    process.exit(1); // Quitter si la connexion échoue
  }
}

// Route principale
app.get("/", (req, res) => {
  res.send("Hi");
});

// Route pour récupérer les produits
app.get("/produit/acheter", async (req, res) => {
  if (!db) {
    return res.status(500).send("❌ Base de données non initialisée");
  }

  try {
    const produits = await db.collection("produits").find({}).toArray();
    res.status(200).json(produits);
  } catch (err) {
    console.error("❌ Erreur lors de la récupération des données :", err);
    res.status(500).send("Erreur serveur");
  }
});

// Récupérer un produit spécifique
app.get("/produit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const produit = await db.collection("produits").findOne({ id: Number(id) });
    if (!produit) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }
    res.status(200).json(produit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Ajouter un nouveau produit
app.post("/produit/ajouter", async (req, res) => {
  try {
    const { nom, description, prix, stock } = req.body;
    if (!nom || !description || !prix || !stock) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    const newProduct = {
      nom,
      description,
      prix: parseFloat(prix),
      stock: parseInt(stock),
      created_at: new Date(),
    };

    const result = await db.collection("produits").insertOne(newProduct);

    res.status(201).json({
      message: "Produit ajouté avec succès",
      produit: { _id: result.insertedId, ...newProduct },
    });

    // res.status(201).json({ message: "Produit ajouté avec succès", produit: result.ops[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Mettre à jour le stock d'un produit après une commande
app.patch("/produit/:id/stock", async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    // Vérification de la validité du stock
    if (typeof stock !== "number" || stock < 0) {
      return res.status(400).json({ message: "Stock invalide" });
    }

    // Mettre à jour le stock du produit avec l'ID correspondant
    const result = await db
      .collection("produits")
      .updateOne({ id: Number(id) }, { $set: { stock } });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    res.status(200).json({ message: "Stock mis à jour avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Connecter à la base de données et démarrer le serveur
connectDB();
