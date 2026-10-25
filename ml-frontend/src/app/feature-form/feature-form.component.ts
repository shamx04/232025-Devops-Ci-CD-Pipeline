import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PredictionService, PredictionResult } from '../prediction.service';

interface ScenarioPreset {
  id: string;
  title: string;
  type: 'safe' | 'threat';
  summary: string;
  icon: string;
  data: Record<string, any>;
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
  showAdvanced = false;

  isStaticDeployment = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
  demoMode = this.isStaticDeployment;

  selectedScenarioId = 'web';

  // Common friendly dropdown options
  readonly protocols = ['tcp', 'udp', 'icmp', 'arp', 'ospf', 'igmp', 'sctp'];
  readonly services  = ['http', 'dns', 'ftp-data', 'ftp', 'smtp', 'ssh', 'ssl', 'dhcp', 'pop3', '-'];
  readonly states    = ['FIN', 'CON', 'REQ', 'INT', 'RST', 'PAR', 'ECO', 'URN'];

  // Four plain-English scenarios based on real dataset records
  readonly scenarios: ScenarioPreset[] = [
    {
      id: 'web',
      title: 'Normal Web Browsing',
      type: 'safe',
      icon: '🌐',
      summary: 'Legitimate HTTPS website visit with balanced upload & download packets.',
      data: {
        dur: 0.1542, proto: 'tcp', service: 'http', state: 'FIN', spkts: 12, dpkts: 10,
        sbytes: 1450, dbytes: 4200, rate: 142.67, sttl: 62, dttl: 60, sload: 75200.0, dload: 218000.0,
        sloss: 0, dloss: 0, sinpkt: 12.85, dinpkt: 15.4, sjit: 120.4, djit: 45.1,
        swin: 255, stcpb: 142055610, dtcpb: 98124012, dwin: 255, tcprtt: 0.0021, synack: 0.0011,
        ackdat: 0.0010, smean: 120, dmean: 420, trans_depth: 1, response_body_len: 3800,
        ct_srv_src: 2, ct_state_ttl: 0, ct_dst_ltm: 4, ct_src_dport_ltm: 1, ct_dst_sport_ltm: 1,
        ct_dst_src_ltm: 2, is_ftp_login: 0, ct_ftp_cmd: 0, ct_flw_http_mthd: 1, ct_src_ltm: 3,
        ct_srv_dst: 2, is_sm_ips_ports: 0
      }
    },
    {
      id: 'file',
      title: 'Safe File Download (FTP)',
      type: 'safe',
      icon: '📁',
      summary: 'Standard file download with clean connection termination.',
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
    {
      id: 'ddos',
      title: 'DDoS Flooding Attack',
      type: 'threat',
      icon: '💥',
      summary: 'Malicious flood sending 200,000 UDP packets/sec to overwhelm the target.',
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
    {
      id: 'exploit',
      title: 'Malware Exploit Attempt',
      type: 'threat',
      icon: '⚠️',
      summary: 'Suspicious payload with unusual TTL values and packet loss patterns.',
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
    }
  ];

  constructor(private fb: FormBuilder, private predictionService: PredictionService) {
    // Initialise with Scenario 1
    const initData = this.scenarios[0].data;
    this.form = this.fb.group({
      dur:                [initData['dur'],                [Validators.required]],
      proto:              [initData['proto'],              [Validators.required]],
      service:            [initData['service'],            [Validators.required]],
      state:              [initData['state'],              [Validators.required]],
      spkts:              [initData['spkts'],              [Validators.required]],
      dpkts:              [initData['dpkts'],              [Validators.required]],
      sbytes:             [initData['sbytes'],             [Validators.required]],
      dbytes:             [initData['dbytes'],             [Validators.required]],
      rate:               [initData['rate'],               [Validators.required]],
      sttl:               [initData['sttl'],               [Validators.required]],
      dttl:               [initData['dttl'],               [Validators.required]],
      sload:              [initData['sload'],              [Validators.required]],
      dload:              [initData['dload'],              [Validators.required]],
      sloss:              [initData['sloss'],              [Validators.required]],
      dloss:              [initData['dloss'],              [Validators.required]],
      sinpkt:             [initData['sinpkt'],             [Validators.required]],
      dinpkt:             [initData['dinpkt'],             [Validators.required]],
      sjit:               [initData['sjit'],               [Validators.required]],
      djit:               [initData['djit'],               [Validators.required]],
      swin:               [initData['swin'],               [Validators.required]],
      stcpb:              [initData['stcpb'],              [Validators.required]],
      dtcpb:              [initData['dtcpb'],              [Validators.required]],
      dwin:               [initData['dwin'],               [Validators.required]],
      tcprtt:             [initData['tcprtt'],             [Validators.required]],
      synack:             [initData['synack'],             [Validators.required]],
      ackdat:             [initData['ackdat'],             [Validators.required]],
      smean:              [initData['smean'],              [Validators.required]],
      dmean:              [initData['dmean'],              [Validators.required]],
      trans_depth:        [initData['trans_depth'],        [Validators.required]],
      response_body_len:  [initData['response_body_len'],  [Validators.required]],
      ct_srv_src:         [initData['ct_srv_src'],         [Validators.required]],
      ct_state_ttl:       [initData['ct_state_ttl'],       [Validators.required]],
      ct_dst_ltm:         [initData['ct_dst_ltm'],         [Validators.required]],
      ct_src_dport_ltm:   [initData['ct_src_dport_ltm'],   [Validators.required]],
      ct_dst_sport_ltm:   [initData['ct_dst_sport_ltm'],   [Validators.required]],
      ct_dst_src_ltm:     [initData['ct_dst_src_ltm'],     [Validators.required]],
      is_ftp_login:       [initData['is_ftp_login'],       [Validators.required]],
      ct_ftp_cmd:         [initData['ct_ftp_cmd'],         [Validators.required]],
      ct_flw_http_mthd:   [initData['ct_flw_http_mthd'],   [Validators.required]],
      ct_src_ltm:         [initData['ct_src_ltm'],         [Validators.required]],
      ct_srv_dst:         [initData['ct_srv_dst'],         [Validators.required]],
      is_sm_ips_ports:    [initData['is_sm_ips_ports'],    [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Run an initial analysis right away so the user immediately sees a live result
    this.analyzeTraffic();
  }

  selectScenario(scenario: ScenarioPreset): void {
    this.selectedScenarioId = scenario.id;
    this.form.patchValue(scenario.data);
    this.analyzeTraffic();
  }

  toggleAdvanced(): void {
    this.showAdvanced = !this.showAdvanced;
  }

  toggleMode(): void {
    this.demoMode = !this.demoMode;
    this.analyzeTraffic();
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.analyzeTraffic();
  }

  analyzeTraffic(): void {
    this.loading = true;
    this.errorMsg = '';

    if (this.demoMode) {
      setTimeout(() => {
        const val = this.form.value;
        const isAttack = (val.sttl > 100 && (val.rate > 500 || val.sload > 5000000)) ||
                         val.service === '-' ||
                         val.state === 'INT' ||
                         val.ct_state_ttl > 0 ||
                         val.ct_dst_ltm > 15;
        
        const attackProb = isAttack ? 0.96 : 0.03;
        const normalProb = 1 - attackProb;

        this.result = {
          prediction: isAttack ? 1 : 0,
          label: isAttack ? 'Attack' : 'Normal',
          probabilities: {
            Normal: Number(normalProb.toFixed(2)),
            Attack: Number(attackProb.toFixed(2))
          }
        };
        this.loading = false;
      }, 250);
      return;
    }

    // Call live local Flask API
    this.predictionService.predict(this.form.value).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.error ?? 'Live Flask server is unreachable. You can switch to Demo Mode above to test in the browser.';
        this.loading = false;
      }
    });
  }

  reset(): void {
    this.selectScenario(this.scenarios[0]);
  }
}
