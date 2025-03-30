const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());

const url = "mongodb://localhost:27017";
const dbName = "produits_service";
let db;

async function connectDB() {
  try {
    const client = await MongoClient.connect(url);
    console.log("✅ Connexion réussie avec Mongo");
    db = client.db(dbName);

    // Démarrer le serveur une fois la connexion établie
    const PORT = 4002;
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

// Récupérer toutes les livraisons
app.get("/livraisons", async (req, res) => {
  if (!db) {
    return res.status(500).send("❌ Base de données non initialisée");
  }

  try {
    const livraisons = await db.collection("livraisons").find({}).toArray();
    res.status(200).json(livraisons);
  } catch (err) {
    console.error("❌ Erreur lors de la récupération des données :", err);
    res.status(500).send("Erreur serveur");
  }
});

// Récupérer une livraison spécifique par son ID
app.get("/livraison/:id", async (req, res) => {
  const { id } = req.params;

  if (!db) {
    return res.status(500).send("❌ Base de données non initialisée");
  }

  try {
    const livraison = await db
      .collection("livraisons")
      .findOne({ id_livraison: id });

    if (!livraison) {
      return res.status(404).json({ message: "❌ Livraison non trouvée" });
    }

    res.status(200).json(livraison);
  } catch (err) {
    console.error("❌ Erreur lors de la récupération de la livraison :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Ajouter une nouvelle livraison
// Route pour ajouter une livraison
app.post("/livraison/ajouter", async (req, res) => {
  const { id_commande, transporteur } = req.body;

  if (!id_commande || !transporteur) {
    return res.status(400).json({ message: "❌ Données manquantes" });
  }

  if (!db) {
    return res.status(500).send("❌ Base de données non initialisée");
  }

  try {
    // Vérifier si la commande existe
    const commande = await db.collection("commandes").findOne({ id_commande });

    // if (!commande) {
    //   return res.status(404).json({ message: "❌ Commande non trouvée" });
    // }

    // Créer une nouvelle livraison
    const newLivraison = {
      id_livraison: `LIV00${Math.floor(Math.random() * 1000)}`, // Générer un ID unique pour la livraison
      id_commande,
      transporteur,
      statut: "expédié", // Statut par défaut
      date_expedition: new Date().toISOString(),
      date_livraison: null, // La date de livraison est nulle au départ
    };

    // Sauvegarder la livraison dans la base de données
    await db.collection("livraisons").insertOne(newLivraison);

    res.status(201).json({
      message: "✅ Livraison ajoutée avec succès",
      livraison: newLivraison,
    });
  } catch (err) {
    console.error("❌ Erreur lors de l'ajout de la livraison :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Mettre à jour le statut d'une livraison
app.put("/livraison/:id", async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;

  if (!db) {
    return res.status(500).send("❌ Base de données non initialisée");
  }

  if (!statut) {
    return res.status(400).json({ message: "❌ Le statut est requis" });
  }

  // Vérifier que le statut est valide
  const statutsValides = ["expédié", "en transit", "livré", "annulé"];
  if (!statutsValides.includes(statut)) {
    return res.status(400).json({
      message:
        "❌ Statut invalide. Les statuts valides sont : expédié, en transit, livré, annulé",
    });
  }

  try {
    const updateData = {
      statut,
      ...(statut === "livré" && { date_livraison: new Date().toISOString() }),
    };

    const result = await db
      .collection("livraisons")
      .updateOne({ id_livraison: id }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "❌ Livraison non trouvée" });
    }

    res.status(200).json({
      message: "✅ Statut de la livraison mis à jour avec succès",
      statut: statut,
    });
  } catch (err) {
    console.error("❌ Erreur lors de la mise à jour du statut :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

connectDB();
