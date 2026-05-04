/**
 * Pre-recorded discovery inputs for the three reference architecture scenarios.
 * Reserved for future LLM evaluation tests that verify discovery skill output
 * against known-good scenario inputs. Not currently consumed by any test.
 */

export interface ScenarioInput {
  name: string;
  pattern: number;
  description: string;
  systems: string[];
  events: string[];
  protocols: string[];
  requirements: {
    latency?: string;
    throughput?: string;
    reliability?: string;
    compliance?: string[];
  };
  existingMessaging?: string;
  vertical: string;
}

export const BANK_CHAT_AGENT: ScenarioInput = {
  name: 'Retail Banking Chat Agent',
  pattern: 1,
  description: 'Multi-channel AI assistant for retail banking. Customers interact via web chat, mobile app, and Slack. The assistant can check balances, view transaction history, initiate fund transfers, submit support tickets, and answer FAQ questions. Backend systems include a core banking platform (REST), a transaction database (PostgreSQL), a CRM (Salesforce), and a knowledge base.',
  systems: [
    'Core Banking Platform (REST API, Java)',
    'Transaction Database (PostgreSQL)',
    'CRM (Salesforce)',
    'Knowledge Base (internal wiki)',
    'Web Chat (React frontend)',
    'Mobile App (React Native)',
    'Slack workspace',
  ],
  events: [
    'balance-check (Direct, ~500/sec peak)',
    'transaction-history (Guaranteed, ~100/sec)',
    'fund-transfer (Guaranteed, ~20/sec)',
    'support-ticket (Guaranteed, ~50/sec)',
    'faq-query (Direct, ~200/sec)',
  ],
  protocols: ['REST', 'WebSocket', 'MQTT'],
  requirements: {
    latency: '< 2s for balance checks, < 5s for transaction history',
    throughput: '~1000 events/sec aggregate peak',
    reliability: 'Guaranteed messaging for all financial transactions',
    compliance: ['PCI-DSS', 'SOC 2', 'data residency (US only)'],
  },
  existingMessaging: 'IBM MQ for core banking batch jobs',
  vertical: 'banking',
};

export const MARKET_DATA_DISTRIBUTION: ScenarioInput = {
  name: 'Global Market Data Distribution',
  pattern: 2,
  description: 'Real-time market data distribution across 4 trading hubs: New York, London, Singapore, and Tokyo. Equity and FX data from 3 feed handlers must reach trader desktops within 5ms at each hub. Order flow is separate and requires Guaranteed messaging with full audit trail. Regulatory replay required for 7 years.',
  systems: [
    'Feed Handler A (Reuters, FIX protocol)',
    'Feed Handler B (Bloomberg, proprietary)',
    'Feed Handler C (Internal pricing engine)',
    'Trader Desktop (C++ native, SMF)',
    'Order Management System (Java, JMS)',
    'Risk Engine (Python, REST)',
    'Compliance Audit System (Kafka consumer)',
    'Historical Data Store (time-series DB)',
  ],
  events: [
    'market-data/equity (Direct, ~50,000/sec per hub)',
    'market-data/fx (Direct, ~30,000/sec per hub)',
    'order-flow (Guaranteed, ~5,000/sec aggregate)',
    'risk-update (Direct, ~1,000/sec)',
    'audit-event (Guaranteed, ~10,000/sec)',
  ],
  protocols: ['SMF', 'JMS', 'REST', 'FIX'],
  requirements: {
    latency: '< 5ms intra-hub for market data, < 50ms cross-hub',
    throughput: '~100,000 events/sec per hub',
    reliability: 'Direct for market data, Guaranteed for orders and audit',
    compliance: ['MiFID II', 'SEC Rule 17a-4', '7-year replay'],
  },
  existingMessaging: 'Kafka for audit trail, TIBCO for some legacy feeds',
  vertical: 'capital-markets',
};

export const MANUFACTURING_IOT: ScenarioInput = {
  name: 'Hybrid IT/OT Manufacturing Event Mesh',
  pattern: 3,
  description: 'Global manufacturer with 12 plants across North America, Europe, and Asia. Plant floor equipment publishes telemetry via OPC UA and MQTT. Regional aggregation hubs normalize data before forwarding to cloud analytics. Command and control flows from cloud back to plant floor for quality adjustments. Optional SAM layer for predictive maintenance AI.',
  systems: [
    'PLC/SCADA systems (OPC UA, Modbus)',
    'Edge sensors (MQTT, 10,000+ devices per plant)',
    'Edge broker (Solace Software Event Broker, per plant)',
    'Regional aggregation hub (3 hubs: NA, EU, APAC)',
    'Cloud analytics (AWS, time-series + ML pipeline)',
    'MES (Manufacturing Execution System, REST)',
    'ERP (SAP, RFC/REST)',
    'Predictive maintenance AI (Python, optional SAM)',
  ],
  events: [
    'telemetry/temperature (Direct, ~100/sec per device)',
    'telemetry/vibration (Direct, ~50/sec per device)',
    'telemetry/quality-metric (Guaranteed, ~10/sec per line)',
    'command/quality-adjustment (Guaranteed, ~1/min)',
    'alert/threshold-breach (Guaranteed, ~5/min)',
    'maintenance/prediction (Guaranteed, ~1/hour per device)',
  ],
  protocols: ['MQTT', 'REST', 'OPC UA (bridged)'],
  requirements: {
    latency: '< 100ms plant-to-regional, < 500ms regional-to-cloud',
    throughput: '~1M events/sec aggregate across all plants',
    reliability: 'Direct for telemetry, Guaranteed for commands and alerts',
    compliance: ['ISO 27001', 'IEC 62443 (OT security)'],
  },
  existingMessaging: 'MQTT brokers (Mosquitto) at some plants',
  vertical: 'manufacturing',
};

export const ALL_SCENARIOS = [BANK_CHAT_AGENT, MARKET_DATA_DISTRIBUTION, MANUFACTURING_IOT];
