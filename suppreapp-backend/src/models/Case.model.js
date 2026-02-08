import mongoose from "mongoose";

const CaseSchema = new mongoose.Schema(
  {
    serviceType: { type: String, enum: ["NIPT", "ADN", "CELL"], required: true },

    // sheet-like
    stt: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },

    invoiceRequested: { type: Boolean, default: false },
    caseCode: { type: String, default: "" },
    patientName: { type: String, default: "" },

    // service & pricing
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null },
    serviceName: { type: String, default: "" }, // cache name
    serviceCode: { type: String, default: "" }, // cache code
    detailNote: { type: String, default: "" },

    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", default: null },
    agentLevel: { type: String, default: "" },
    agentTierLabel: { type: String, default: "" },
    price: { type: Number, default: 0 },

    paid: { type: Boolean, default: false },
    collectedAmount: { type: Number, default: 0 },

    // workflow
    lab: { type: String, default: "" },
    source: { type: String, default: "" },
    salesOwner: { type: String, default: "" },
    sampleCollector: { type: String, default: "" },

    sentAt: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
    dueDate: { type: Date, default: null },

    transferStatus: { type: String, default: "" },
    receiveStatus: { type: String, default: "" },
    processStatus: { type: String, default: "" },
    feedbackStatus: { type: String, default: "" },

    glReturned: { type: Boolean, default: false },
    gxReceived: { type: Boolean, default: false },
    softFileDone: { type: Boolean, default: false },
    hardFileDone: { type: Boolean, default: false },

    invoiceInfo: { type: String, default: "" },

    createdBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Case", CaseSchema);
