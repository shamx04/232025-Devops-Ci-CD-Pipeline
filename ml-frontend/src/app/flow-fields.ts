/** The 42 UNSW-NB15 flow features the model reads, named for people. */

export type FlowValues = Record<string, number | string>;
export type GroupId = 'connection' | 'volume' | 'timing' | 'history';

export interface FieldDef {
  key: string;
  label: string;
  help: string;
  unit?: string;
  options?: readonly string[];
}

export interface FieldGroup {
  id: GroupId;
  label: string;
  fields: FieldDef[];
}

export const PROTOCOLS = ['tcp', 'udp', 'unas', 'arp', 'ospf', 'sctp', 'any', 'gre', 'icmp', 'igmp'] as const;
export const SERVICES = ['-', 'http', 'ftp', 'ftp-data', 'dns', 'smtp', 'ssh', 'ssl', 'dhcp', 'pop3', 'radius', 'snmp', 'irc'] as const;
export const STATES = ['FIN', 'INT', 'CON', 'REQ', 'RST', 'ACC', 'CLO', 'ECO', 'PAR', 'URN', 'no'] as const;

const SAME = 'Among the last 100 connections';

export const FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'connection',
    label: 'Connection',
    fields: [
      { key: 'proto', label: 'Protocol', help: 'Transport protocol of the flow', options: PROTOCOLS },
      { key: 'service', label: 'Service', help: 'Application on the destination port ("-" when unknown)', options: SERVICES },
      { key: 'state', label: 'State', help: 'How the connection ended', options: STATES },
      { key: 'dur', label: 'Duration', help: 'Time from first to last packet', unit: 's' },
      { key: 'trans_depth', label: 'HTTP pipeline depth', help: 'Requests pipelined on the connection' },
      { key: 'response_body_len', label: 'Response body', help: 'Uncompressed size of the HTTP response', unit: 'bytes' }
    ]
  },
  {
    id: 'volume',
    label: 'Packets and bytes',
    fields: [
      { key: 'spkts', label: 'Packets sent', help: 'Client to server' },
      { key: 'dpkts', label: 'Packets returned', help: 'Server to client' },
      { key: 'sbytes', label: 'Bytes sent', help: 'Client to server', unit: 'bytes' },
      { key: 'dbytes', label: 'Bytes returned', help: 'Server to client', unit: 'bytes' },
      { key: 'smean', label: 'Avg. sent packet', help: 'Mean packet size from the client', unit: 'bytes' },
      { key: 'dmean', label: 'Avg. returned packet', help: 'Mean packet size from the server', unit: 'bytes' },
      { key: 'rate', label: 'Packet rate', help: 'Packets per second, both directions', unit: 'pkt/s' },
      { key: 'sload', label: 'Send load', help: 'Client bits per second', unit: 'bit/s' },
      { key: 'dload', label: 'Return load', help: 'Server bits per second', unit: 'bit/s' },
      { key: 'sloss', label: 'Sent packets lost', help: 'Retransmitted or dropped from the client' },
      { key: 'dloss', label: 'Returned packets lost', help: 'Retransmitted or dropped from the server' }
    ]
  },
  {
    id: 'timing',
    label: 'Timing and TCP',
    fields: [
      { key: 'sttl', label: 'Client TTL', help: 'Time-to-live on client packets' },
      { key: 'dttl', label: 'Server TTL', help: 'Time-to-live on server packets' },
      { key: 'sinpkt', label: 'Client packet gap', help: 'Mean time between client packets', unit: 'ms' },
      { key: 'dinpkt', label: 'Server packet gap', help: 'Mean time between server packets', unit: 'ms' },
      { key: 'sjit', label: 'Client jitter', help: 'Variation in client packet gaps', unit: 'ms' },
      { key: 'djit', label: 'Server jitter', help: 'Variation in server packet gaps', unit: 'ms' },
      { key: 'tcprtt', label: 'Handshake round trip', help: 'SYN-ACK time plus ACK time', unit: 's' },
      { key: 'synack', label: 'SYN to SYN-ACK', help: 'Server response time to the first SYN', unit: 's' },
      { key: 'ackdat', label: 'SYN-ACK to ACK', help: 'Client response time to the SYN-ACK', unit: 's' },
      { key: 'swin', label: 'Client window', help: 'TCP window the client advertised' },
      { key: 'dwin', label: 'Server window', help: 'TCP window the server advertised' },
      { key: 'stcpb', label: 'Client base sequence', help: 'First TCP sequence number from the client' },
      { key: 'dtcpb', label: 'Server base sequence', help: 'First TCP sequence number from the server' }
    ]
  },
  {
    id: 'history',
    label: 'Recent connections',
    fields: [
      { key: 'ct_srv_src', label: 'Same service, same client', help: SAME },
      { key: 'ct_srv_dst', label: 'Same service, same server', help: SAME },
      { key: 'ct_src_ltm', label: 'Same client', help: SAME },
      { key: 'ct_dst_ltm', label: 'Same server', help: SAME },
      { key: 'ct_dst_src_ltm', label: 'Same client and server', help: SAME },
      { key: 'ct_src_dport_ltm', label: 'Same client, same server port', help: SAME },
      { key: 'ct_dst_sport_ltm', label: 'Same server, same client port', help: SAME },
      { key: 'ct_state_ttl', label: 'State and TTL band', help: 'Dataset bucket combining state and TTL ranges' },
      { key: 'ct_flw_http_mthd', label: 'HTTP method flows', help: 'Flows using GET, POST and similar' },
      { key: 'ct_ftp_cmd', label: 'FTP command flows', help: 'Flows carrying an FTP command' },
      { key: 'is_ftp_login', label: 'FTP login used', help: '1 if the FTP session logged in with a password' },
      { key: 'is_sm_ips_ports', label: 'Same address and port', help: '1 if client and server address and port match' }
    ]
  }
];

export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(
  FIELD_GROUPS.flatMap(g => g.fields).map(f => [f.key, f])
);

export function fieldLabel(key: string): string {
  return FIELD_BY_KEY[key]?.label ?? key;
}

/** Stable key for a set of flow values, used to look up recorded model scores. */
export function flowKey(values: FlowValues): string {
  return Object.keys(FIELD_BY_KEY).map(k => String(values[k])).join('|');
}
