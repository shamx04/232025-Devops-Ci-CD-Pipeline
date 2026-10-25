import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PredictionService, PredictionResult } from '../prediction.service';

@Component({
  selector: 'app-feature-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './feature-form.component.html',
  styleUrls: ['./feature-form.component.css']
})
export class FeatureFormComponent {
  form: FormGroup;
  result: PredictionResult | null = null;
  loading = false;
  errorMsg = '';

  protocols = ['tcp', 'udp', 'icmp', 'arp', 'ospf', 'igmp'];
  services  = ['-', 'http', 'ftp', 'ftp-data', 'dns', 'smtp', 'ssh', 'ssl', 'dhcp', 'pop3', 'radius', 'snmp', 'irc'];
  states    = ['FIN', 'CON', 'REQ', 'RST', 'INT', 'PAR', 'ECO', 'URN', 'no'];

  constructor(private fb: FormBuilder, private predictionService: PredictionService) {
    this.form = this.fb.group({
      dur:                [0,    [Validators.required]],
      proto:              ['tcp',[Validators.required]],
      service:            ['http',[Validators.required]],
      state:              ['FIN', [Validators.required]],
      spkts:              [2,    [Validators.required]],
      dpkts:              [0,    [Validators.required]],
      sbytes:             [500,  [Validators.required]],
      dbytes:             [0,    [Validators.required]],
      rate:               [0,    [Validators.required]],
      sttl:               [254,  [Validators.required]],
      dttl:               [0,    [Validators.required]],
      sload:              [0,    [Validators.required]],
      dload:              [0,    [Validators.required]],
      sloss:              [0,    [Validators.required]],
      dloss:              [0,    [Validators.required]],
      sinpkt:             [0,    [Validators.required]],
      dinpkt:             [0,    [Validators.required]],
      sjit:               [0,    [Validators.required]],
      djit:               [0,    [Validators.required]],
      swin:               [0,    [Validators.required]],
      stcpb:              [0,    [Validators.required]],
      dtcpb:              [0,    [Validators.required]],
      dwin:               [0,    [Validators.required]],
      tcprtt:             [0,    [Validators.required]],
      synack:             [0,    [Validators.required]],
      ackdat:             [0,    [Validators.required]],
      smean:              [0,    [Validators.required]],
      dmean:              [0,    [Validators.required]],
      trans_depth:        [0,    [Validators.required]],
      response_body_len:  [0,    [Validators.required]],
      ct_srv_src:         [1,    [Validators.required]],
      ct_state_ttl:       [0,    [Validators.required]],
      ct_dst_ltm:         [1,    [Validators.required]],
      ct_src_dport_ltm:   [1,    [Validators.required]],
      ct_dst_sport_ltm:   [1,    [Validators.required]],
      ct_dst_src_ltm:     [1,    [Validators.required]],
      is_ftp_login:       [0,    [Validators.required]],
      ct_ftp_cmd:         [0,    [Validators.required]],
      ct_flw_http_mthd:   [0,    [Validators.required]],
      ct_src_ltm:         [1,    [Validators.required]],
      ct_srv_dst:         [1,    [Validators.required]],
      is_sm_ips_ports:    [0,    [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.result = null;
    this.errorMsg = '';

    this.predictionService.predict(this.form.value).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.error ?? 'Prediction failed. Is the Flask server running?';
        this.loading = false;
      }
    });
  }

  reset(): void {
    this.form.reset();
    this.result = null;
    this.errorMsg = '';
  }
}
