// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { nanoid } from "nanoid";
var MemStorage = class {
  clients;
  followUps;
  interactions;
  constructor() {
    this.clients = /* @__PURE__ */ new Map();
    this.followUps = /* @__PURE__ */ new Map();
    this.interactions = /* @__PURE__ */ new Map();
  }
  async getClient(id) {
    return this.clients.get(id);
  }
  async getAllClients() {
    return Array.from(this.clients.values());
  }
  async createClient(insertClient) {
    const id = nanoid();
    const client = {
      ...insertClient,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.clients.set(id, client);
    return client;
  }
  async updateClient(id, updates) {
    const client = this.clients.get(id);
    if (!client) return void 0;
    const updatedClient = {
      ...client,
      ...updates
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }
  async deleteClient(id) {
    const deleted = this.clients.delete(id);
    if (deleted) {
      Array.from(this.followUps.values()).filter((f) => f.clientId === id).forEach((f) => this.followUps.delete(f.id));
      Array.from(this.interactions.values()).filter((i) => i.clientId === id).forEach((i) => this.interactions.delete(i.id));
    }
    return deleted;
  }
  async getFollowUp(id) {
    return this.followUps.get(id);
  }
  async getAllFollowUps() {
    return Array.from(this.followUps.values());
  }
  async getFollowUpsByClient(clientId) {
    return Array.from(this.followUps.values()).filter(
      (f) => f.clientId === clientId
    );
  }
  async createFollowUp(insertFollowUp) {
    const id = nanoid();
    const followUp = {
      ...insertFollowUp,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.followUps.set(id, followUp);
    return followUp;
  }
  async updateFollowUp(id, updates) {
    const followUp = this.followUps.get(id);
    if (!followUp) return void 0;
    const updatedFollowUp = {
      ...followUp,
      ...updates
    };
    this.followUps.set(id, updatedFollowUp);
    return updatedFollowUp;
  }
  async deleteFollowUp(id) {
    return this.followUps.delete(id);
  }
  async getInteraction(id) {
    return this.interactions.get(id);
  }
  async getAllInteractions() {
    return Array.from(this.interactions.values());
  }
  async getInteractionsByClient(clientId) {
    return Array.from(this.interactions.values()).filter((i) => i.clientId === clientId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async createInteraction(insertInteraction) {
    const id = nanoid();
    const interaction = {
      ...insertInteraction,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.interactions.set(id, interaction);
    const client = this.clients.get(insertInteraction.clientId);
    if (client) {
      client.lastContactDate = /* @__PURE__ */ new Date();
      this.clients.set(client.id, client);
    }
    return interaction;
  }
  async deleteInteraction(id) {
    return this.interactions.delete(id);
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var clients = pgTable("clients", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  totalPurchases: integer("total_purchases").notNull().default(0),
  lastContactDate: timestamp("last_contact_date"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var followUps = pgTable("follow_ups", {
  id: varchar("id").primaryKey(),
  clientId: varchar("client_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var interactions = pgTable("interactions", {
  id: varchar("id").primaryKey(),
  clientId: varchar("client_id").notNull(),
  type: text("type").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true
});
var insertFollowUpSchema = createInsertSchema(followUps).omit({
  id: true,
  createdAt: true
});
var insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  createdAt: true
});

// server/routes.ts
import { z } from "zod";
async function registerRoutes(app2) {
  app2.get("/api/clients", async (req, res) => {
    try {
      const clients2 = await storage.getAllClients();
      res.json(clients2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });
  app2.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });
  app2.post("/api/clients", async (req, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create client" });
    }
  });
  app2.put("/api/clients/:id", async (req, res) => {
    try {
      const data = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, data);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update client" });
    }
  });
  app2.delete("/api/clients/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteClient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete client" });
    }
  });
  app2.get("/api/follow-ups", async (req, res) => {
    try {
      const followUps2 = await storage.getAllFollowUps();
      res.json(followUps2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch follow-ups" });
    }
  });
  app2.get("/api/follow-ups/:id", async (req, res) => {
    try {
      const followUp = await storage.getFollowUp(req.params.id);
      if (!followUp) {
        return res.status(404).json({ error: "Follow-up not found" });
      }
      res.json(followUp);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch follow-up" });
    }
  });
  app2.post("/api/follow-ups", async (req, res) => {
    try {
      const data = insertFollowUpSchema.parse(req.body);
      const followUp = await storage.createFollowUp(data);
      res.status(201).json(followUp);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create follow-up" });
    }
  });
  app2.put("/api/follow-ups/:id", async (req, res) => {
    try {
      const data = insertFollowUpSchema.partial().parse(req.body);
      const followUp = await storage.updateFollowUp(req.params.id, data);
      if (!followUp) {
        return res.status(404).json({ error: "Follow-up not found" });
      }
      res.json(followUp);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update follow-up" });
    }
  });
  app2.delete("/api/follow-ups/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFollowUp(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Follow-up not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete follow-up" });
    }
  });
  app2.get("/api/interactions", async (req, res) => {
    try {
      const interactions2 = await storage.getAllInteractions();
      res.json(interactions2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch interactions" });
    }
  });
  app2.get("/api/interactions/:clientId", async (req, res) => {
    try {
      const interactions2 = await storage.getInteractionsByClient(
        req.params.clientId
      );
      res.json(interactions2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch interactions" });
    }
  });
  app2.post("/api/interactions", async (req, res) => {
    try {
      const data = insertInteractionSchema.parse(req.body);
      const interaction = await storage.createInteraction(data);
      res.status(201).json(interaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create interaction" });
    }
  });
  app2.delete("/api/interactions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInteraction(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Interaction not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete interaction" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid as nanoid2 } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "127.0.0.1", () => {
    log(`serving on http://localhost:${port}`);
  });
})();
