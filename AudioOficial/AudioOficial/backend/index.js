const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch"); // Para fazer requisições à API do WhatsApp

const app = express();
const PORT = 3000;

// ================= CONFIG =================
const WHATSAPP_TOKEN = "COLOQUE_SEU_TOKEN_AQUI";
const PHONE_NUMBER_ID = "COLOQUE_SEU_PHONE_NUMBER_ID_AQUI";
// ===========================================

// Pasta onde os áudios serão salvos
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configuração de armazenamento do multer
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

// Rota raiz (teste rápido)
app.get("/", (req, res) => {
  res.send("Servidor rodando.");
});

// Rota para upload do áudio
app.post("/upload", upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado." });
  }

  const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  return res.json({ downloadUrl: fileUrl });
});

// Rota para envio no WhatsApp
app.post("/send-whatsapp", async (req, res) => {
  const { to, audioUrl } = req.body;

  if (!to || !audioUrl) {
    return res.status(400).json({ error: "Número e URL do áudio são obrigatórios." });
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to,
          type: "audio",
          audio: {
            link: audioUrl, // URL pública do áudio
          },
        }),
      }
    );

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("Erro ao enviar para WhatsApp:", error);
    return res.status(500).json({ error: "Falha ao enviar mensagem." });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
