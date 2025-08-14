const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");

const app = express();
const PORT = 3000;

// ================= CONFIG =================
const APP_ID = "689cd7af28bcd5b717ade3ba"; // ID do Sunshine App
const API_KEY = "app_689e3a3ee27c0c037744a78a"; // Chave criada no Zendesk
const INTEGRATION_ID = "COLOQUE_SEU_INTEGRATION_ID_AQUI"; // ID da integração WhatsApp
// ===========================================

// Pasta onde os áudios serão salvos
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configuração do multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `audio-${uniqueSuffix}.webm`);
  },
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

// Rota principal
app.get("/", (req, res) => {
  res.send("Servidor rodando.");
});

// Upload do áudio
app.post("/upload", upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado." });
  }

  const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  return res.json({ downloadUrl: fileUrl });
});

// Enviar áudio para WhatsApp via Sunshine
app.post("/send-whatsapp", async (req, res) => {
  const { to, audioUrl } = req.body;

  if (!to || !audioUrl) {
    return res.status(400).json({ error: "Número e URL do áudio são obrigatórios." });
  }

  try {
    const response = await fetch(`https://api.smooch.io/v2/apps/${APP_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "appMaker",
        type: "audio",
        mediaUrl: audioUrl,
        destination: {
          type: "whatsapp",
          integrationId: INTEGRATION_ID,
          destinationId: to
        }
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Erro ao enviar para WhatsApp:", error);
    res.status(500).json({ error: "Falha ao enviar mensagem." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
