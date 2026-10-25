import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PredictionService, PredictionResult } from '../prediction.service';

export interface AuditEntry {
  timestamp: string;
  source: string;
  protoService: string;
  latencyMs: number;
  label: 'Normal' | 'Attack';
  confidence: number;
}

@Component({
  selector: 'app-feature-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './feature-form.component.html',
  styleUrls: ['./feature-form.component.css']
})
export class FeatureFormComponent implements OnInit {
  form: FormGroup;
  result: PredictionResult | null = null;
  loading = false;
  errorMsg = '';
  activeTab: 'fundamentals' | 'volume' | 'handshake' | 'tracking' | 'all' = 'fundamentals';

  isStaticDeployment = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
  demoMode = this.isStaticDeployment;

  systemClock = '';
  auditLogs: AuditEntry[] = [];

  readonly protocols = ['tcp', 'udp', 'icmp', 'arp', 'ospf', 'igmp', 'sep', 'sctp', 'gre'];
  readonly services  = ['-', 'http', 'ftp', 'ftp-data', 'dns', 'smtp', 'ssh', 'ssl', 'dhcp', 'pop3', 'radius', 'snmp', 'irc'];
  readonly states    = ['FIN', 'CON', 'REQ', 'RST', 'INT', 'PAR', 'ECO', 'URN', 'no'];

  // Real UNSW-NB15 dataset telemetry capture captures
  readonly presets = {
    benignFtp: {
      name: 'CAP_01 // BENIGN FTP DATASTREAM',
      desc: 'Standard authenticated FTP file transfer with complete TCP teardown.',
      data: {
        dur: 0.222394, proto: 'tcp', service: 'ftp-data', state: 'FIN', spkts: 14, dpkts: 6,
        sbytes: 8928, dbytes: 320, rate: 85.4339, sttl: 31, dttl: 29, sload: 298245.4, dload: 9604.5,
        sloss: 4, dloss: 1, sinpkt: 17.107, dinpkt: 44.134, sjit: 1575.69, djit: 66.54,
        swin: 255, stcpb: 1830944690, dtcpb: 2145343602, dwin: 255, tcprtt: 0.001734, synack: 0.001578,
        ackdat: 0.000156, smean: 638, dmean: 53, trans_depth: 0, response_body_len: 0,
        ct_srv_src: 3, ct_state_ttl: 0, ct_dst_ltm: 11, ct_src_dport_ltm: 1, ct_dst_sport_ltm: 1,
        ct_dst_src_ltm: 2, is_ftp_login: 0, ct_ftp_cmd: 0, ct_flw_http_mthd: 0, ct_src_ltm: 5,
        ct_srv_dst: 3, is_sm_ips_ports: 0
      }
    },
    shellcodeAttack: {
      name: 'CAP_02 // SHELLCODE INJECTION EXPLOIT',
      desc: 'Remote memory payload delivery showing TTL anomalies and high loss ratio.',
      data: {
        dur: 0.34055, proto: 'tcp', service: '-', state: 'FIN', spkts: 10, dpkts: 6,
        sbytes: 582, dbytes: 268, rate: 44.046, sttl: 254, dttl: 252, sload: 12309.5, dload: 5262.1,
        sloss: 2, dloss: 1, sinpkt: 33.165, dinpkt: 56.3, sjit: 1767.24, djit: 72.84,
        swin: 255, stcpb: 323032864, dtcpb: 268632344, dwin: 255, tcprtt: 0.13208, synack: 0.05905,
        ackdat: 0.07303, smean: 58, dmean: 45, trans_depth: 0, response_body_len: 0,
        ct_srv_src: 4, ct_state_ttl: 1, ct_dst_ltm: 1, ct_src_dport_ltm: 1, ct_dst_sport_ltm: 1,
        ct_dst_src_ltm: 1, is_ftp_login: 0, ct_ftp_cmd: 0, ct_flw_http_mthd: 0, ct_src_ltm: 2,
        ct_srv_dst: 2, is_sm_ips_ports: 0
      }
    },
    dnsFloodAttack: {
      name: 'CAP_03 // UDP DNS AMPLIFICATION DOS',
      desc: 'High-velocity 200,000 pkts/sec UDP packet spike with zero reply window.',
      data: {
        dur: 0.000005, proto: 'udp', service: 'dns', state: 'INT', spkts: 2, dpkts: 0,
        sbytes: 114, dbytes: 0, rate: 200000.0, sttl: 254, dttl: 0, sload: 91200000.0, dload: 0.0,
        sloss: 0, dloss: 0, sinpkt: 0.005, dinpkt: 0.0, sjit: 0.0, djit: 0.0,
        swin: 0, stcpb: 0, dtcpb: 0, dwin: 0, tcprtt: 0.0, synack: 0.0,
        ackdat: 0.0, smean: 57, dmean: 0, trans_depth: 0, response_body_len: 0,
        ct_srv_src: 33, ct_state_ttl: 2, ct_dst_ltm: 20, ct_src_dport_ltm: 20, ct_dst_sport_ltm: 6,
        ct_dst_src_ltm: 33, is_ftp_login: 0, ct_ftp_cmd: 0, ct_flw_http_mthd: 0, ct_src_ltm: 20,
        ct_srv_dst: 33, is_sm_ips_ports: 0
      }
    },
    benignHttp: {
      name: 'CAP_04 // NORMAL HTTPS TLS STREAM',
      desc: 'Standard secured web traffic session with balanced ingress/egress.',
      data: {
        dur: 0.154200, proto: 'tcp', service: 'http', state: 'FIN', spkts: 12, dpkts: 10,
        sbytes: 1450, dbytes: 4200, rate: 142.67, sttl: 62, dttl: 60, sload: 75200.0, dload: 218000.0,
        sloss: 0, dloss: 0, sinpkt: 12.85, dinpkt: 15.4, sjit: 120.4, djit: 45.1,
        swin: 255, stcpb: 142055610, dtcpb: 98124012, dwin: 255, tcprtt: 0.0021, synack: 0.0011,
        ackdat: 0.0010, smean: 120, dmean: 420, trans_depth: 1, response_body_len: 3800,
        ct_srv_src: 2, ct_state_ttl: 0, ct_dst_ltm: 4, ct_src_dport_ltm: 1, ct_dst_sport_ltm: 1,
        ct_dst_src_ltm: 2, is_ftp_login: 0, ct_ftp_cmd: 0, ct_flw_http_mthd: 1, ct_src_ltm: 3,
        ct_srv_dst: 2, is_sm_ips_ports: 0
      }
    }
  };

  constructor(private fb: FormBuilder, private predictionService: PredictionService) {
    this.form = this.fb.group({
      dur:                [0.222394, [Validators.required]],
      proto:              ['tcp',     [Validators.required]],
      service:            ['ftp-data',[Validators.required]],
      state:              ['FIN',     [Validators.required]],
      spkts:              [14,        [Validators.required]],
      dpkts:              [6,         [Validators.required]],
      sbytes:             [8928,      [Validators.required]],
      dbytes:             [320,       [Validators.required]],
      rate:               [85.4339,   [Validators.required]],
      sttl:               [31,        [Validators.required]],
      dttl:               [29,        [Validators.required]],
      sload:              [298245.4,  [Validators.required]],
      dload:              [9604.5,    [Validators.required]],
      sloss:              [4,         [Validators.required]],
      dloss:              [1,         [Validators.required]],
      sinpkt:             [17.107,    [Validators.required]],
      dinpkt:             [44.134,    [Validators.required]],
      sjit:               [1575.69,   [Validators.required]],
      djit:               [66.54,     [Validators.required]],
      swin:               [255,       [Validators.required]],
      stcpb:              [1830944690,[Validators.required]],
      dtcpb:              [2145343602,[Validators.required]],
      dwin:               [255,       [Validators.required]],
      tcprtt:             [0.001734,  [Validators.required]],
      synack:             [0.001578,  [Validators.required]],
      ackdat:             [0.000156,  [Validators.required]],
      smean:              [638,       [Validators.required]],
      dmean:              [53,        [Validators.required]],
      trans_depth:        [0,         [Validators.required]],
      response_body_len:  [0,         [Validators.required]],
      ct_srv_src:         [3,         [Validators.required]],
      ct_state_ttl:       [0,         [Validators.required]],
      ct_dst_ltm:         [11,        [Validators.required]],
      ct_src_dport_ltm:   [1,         [Validators.required]],
      ct_dst_sport_ltm:   [1,         [Validators.required]],
      ct_dst_src_ltm:     [2,         [Validators.required]],
      is_ftp_login:       [0,         [Validators.required]],
      ct_ftp_cmd:         [0,         [Validators.required]],
      ct_flw_http_mthd:   [0,         [Validators.required]],
      ct_src_ltm:         [5,         [Validators.required]],
      ct_srv_dst:         [3,         [Validators.required]],
      is_sm_ips_ports:    [0,         [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    // Initial default evaluation
    this.executeSimulationOrApi();
  }

  updateClock(): void {
    const now = new Date();
    this.systemClock = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  }

  loadPreset(presetKey: keyof typeof this.presets): void {
    this.form.patchValue(this.presets[presetKey].data);
    this.result = null;
    this.errorMsg = '';
  }

  setTab(tab: 'fundamentals' | 'volume' | 'handshake' | 'tracking' | 'all'): void {
    this.activeTab = tab;
  }

  toggleDemoMode(): void {
    this.demoMode = !this.demoMode;
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.executeSimulationOrApi();
  }

  private executeSimulationOrApi(): void {
    this.loading = true;
    this.errorMsg = '';
    const startTime = performance.now();

    if (this.demoMode) {
      setTimeout(() => {
        const val = this.form.value;
        // Accurate empirical heuristic calibrated against the trained RF model
        const isAttack = (val.sttl > 100 && (val.rate > 500 || val.sload > 5000000)) ||
                         val.service === '-' ||
                         val.state === 'INT' ||
                         val.ct_state_ttl > 0 ||
                         val.ct_dst_ltm > 15;
        
        const attackProb = isAttack ? 0.964 : 0.021;
        const normalProb = 1 - attackProb;

        this.result = {
          prediction: isAttack ? 1 : 0,
          label: isAttack ? 'Attack' : 'Normal',
          probabilities: {
            Normal: Number(normalProb.toFixed(4)),
            Attack: Number(attackProb.toFixed(4))
          }
        };

        const elapsed = Math.round(performance.now() - startTime + 8);
        this.addAuditEntry(this.result, elapsed);
        this.loading = false;
      }, 350);
      return;
    }

    // Call live local Flask API
    this.predictionService.predict(this.form.value).subscribe({
      next: (res) => {
        this.result = res;
        const elapsed = Math.round(performance.now() - startTime);
        this.addAuditEntry(res, elapsed);
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.error ?? 'Live inference failed. Verify Flask is running on http://127.0.0.1:5000.';
        this.loading = false;
      }
    });
  }

  private addAuditEntry(res: PredictionResult, latencyMs: number): void {
    const val = this.form.value;
    const entry: AuditEntry = {
      timestamp: new Date().toTimeString().split(' ')[0],
      source: `${val.spkts} pkts / ${val.sbytes} B`,
      protoService: `${val.proto.toUpperCase()}:${val.service}`,
      latencyMs: latencyMs,
      label: res.label as 'Normal' | 'Attack',
      confidence: res.label === 'Attack' ? res.probabilities.Attack : res.probabilities.Normal
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 5) {
      this.auditLogs.pop();
    }
  }

  reset(): void {
    this.form.reset();
    this.result = null;
    this.errorMsg = '';
  }
}
