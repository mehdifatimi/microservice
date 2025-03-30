const express = require("express");
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());

const url = "mongodb://localhost:27017";
const dbName = "produits_service";
const JWT_SECRET = "votre_secret_jwt_super_securise"; // À remplacer par une variable d'environnement en production
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

// Middleware pour vérifier le token JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "❌ Token manquant" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "❌ Token invalide" });
  }
};

// Route principale
app.get("/", (req, res) => {
  res.send("Hi");
});

// Route d'inscription
app.post("/auth/register", async (req, res) => {
  const { email, password, nom } = req.body;

  if (!email || !password || !nom) {
    return res.status(400).json({ message: "❌ Tous les champs sont requis" });
  }

  try {
    // Vérifier si l'utilisateur existe déjà
    const userExists = await db.collection("users").findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "❌ Cet email est déjà utilisé" });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer le nouvel utilisateur
    const newUser = {
      email,
      password: hashedPassword,
      nom,
      date_creation: new Date().toISOString(),
    };

    // Sauvegarder l'utilisateur
    await db.collection("users").insertOne(newUser);

    res.status(201).json({
      message: "✅ Utilisateur créé avec succès",
      user: {
        email: newUser.email,
        nom: newUser.nom,
      },
    });
  } catch (err) {
    console.error("❌ Erreur lors de l'inscription :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Route de connexion
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "❌ Email et mot de passe requis" });
  }

  try {
    // Trouver l'utilisateur
    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "❌ Email ou mot de passe incorrect" });
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(401)
        .json({ message: "❌ Email ou mot de passe incorrect" });
    }

    // Créer le token JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "✅ Connexion réussie",
      token,
      user: {
        email: user.email,
        nom: user.nom,
      },
    });
  } catch (err) {
    console.error("❌ Erreur lors de la connexion :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Route pour obtenir le profil
app.get("/auth/profil", verifyToken, async (req, res) => {
  try {
    const user = await db.collection("users").findOne(
      { _id: req.user.userId },
      { projection: { password: 0 } } // Exclure le mot de passe
    );

    if (!user) {
      return res.status(404).json({ message: "❌ Utilisateur non trouvé" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("❌ Erreur lors de la récupération du profil :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

connectDB();
