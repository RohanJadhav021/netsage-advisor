CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id text NOT NULL UNIQUE,
  symptom text NOT NULL,
  topology text NOT NULL DEFAULT '',
  device_info text NOT NULL DEFAULT '',
  show_output text NOT NULL DEFAULT '',
  additional_notes text NOT NULL DEFAULT '',
  expected_fault text NOT NULL DEFAULT '',
  issue_type text NOT NULL DEFAULT 'Unknown',
  osi_layer text NOT NULL DEFAULT '',
  concept text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'Medium',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  root_cause text NOT NULL,
  confidence integer NOT NULL DEFAULT 0,
  osi_layer text NOT NULL DEFAULT '',
  evidence text[] NOT NULL DEFAULT '{}',
  next_command text NOT NULL DEFAULT '',
  fix_steps text[] NOT NULL DEFAULT '{}',
  severity text NOT NULL DEFAULT '',
  concept text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  diagnosis_id uuid NOT NULL REFERENCES public.diagnoses(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('ACCEPTED','EDITED','REJECTED')),
  correction jsonb,
  comment text NOT NULL DEFAULT '',
  reviewer text NOT NULL DEFAULT 'Unknown reviewer',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rule_check_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  check_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('PASS','FAIL','WARNING')),
  evidence text NOT NULL DEFAULT '',
  explanation text NOT NULL DEFAULT '',
  engine text NOT NULL DEFAULT 'typescript',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.responsible_ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  diagnosis_id uuid NOT NULL REFERENCES public.diagnoses(id) ON DELETE CASCADE,
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  decision text NOT NULL,
  original_diagnosis jsonb NOT NULL,
  human_correction jsonb,
  reason text NOT NULL DEFAULT '',
  final_diagnosis jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO anon;
GRANT ALL ON public.cases TO service_role;
GRANT SELECT, INSERT ON public.diagnoses TO authenticated;
GRANT SELECT, INSERT ON public.diagnoses TO anon;
GRANT ALL ON public.diagnoses TO service_role;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT SELECT, INSERT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
GRANT SELECT, INSERT, DELETE ON public.rule_check_results TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.rule_check_results TO anon;
GRANT ALL ON public.rule_check_results TO service_role;
GRANT SELECT, INSERT ON public.responsible_ai_logs TO authenticated;
GRANT SELECT, INSERT ON public.responsible_ai_logs TO anon;
GRANT ALL ON public.responsible_ai_logs TO service_role;

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsible_ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cases readable by everyone" ON public.cases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cases insertable by everyone" ON public.cases FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "cases updatable by everyone" ON public.cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cases deletable by everyone" ON public.cases FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "diagnoses readable by everyone" ON public.diagnoses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "diagnoses insertable by everyone" ON public.diagnoses FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "reviews readable by everyone" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reviews insertable by everyone" ON public.reviews FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "rule checks readable by everyone" ON public.rule_check_results FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rule checks insertable by everyone" ON public.rule_check_results FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "rule checks deletable by everyone" ON public.rule_check_results FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "ai logs readable by everyone" ON public.responsible_ai_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ai logs insertable by everyone" ON public.responsible_ai_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX idx_diagnoses_case ON public.diagnoses(case_id);
CREATE INDEX idx_reviews_case ON public.reviews(case_id);
CREATE INDEX idx_reviews_diagnosis ON public.reviews(diagnosis_id);
CREATE INDEX idx_rule_checks_case ON public.rule_check_results(case_id);

INSERT INTO public.cases (case_id, symptom, topology, device_info, show_output, additional_notes, expected_fault, issue_type, osi_layer, concept, severity, is_demo) VALUES
('DEMO-001',
 'PC gets an IP address but cannot reach a server in VLAN 30; gateway ping works.',
 'PC -> Access Switch -> Router -> Server',
 'PC1: 192.168.10.25/24 GW 192.168.10.1; SW1 Fa0/1 access VLAN 10, Gi0/1 trunk; R1 Gi0/0.10 192.168.10.1, Gi0/0.30 192.168.30.1; Server 192.168.30.50/24',
 'R1# show ip route
C    192.168.10.0/24 is directly connected, GigabitEthernet0/0.10
C    192.168.30.0/24 is directly connected, GigabitEthernet0/0.30

R1# show access-lists
Extended IP access list BLOCK_APP
    10 deny ip 192.168.10.0 0.0.0.255 192.168.30.0 0.0.0.255
    20 permit ip any any

SW1# show interfaces trunk
Port        Mode  Encapsulation  Status    Native vlan
Gi0/1       on    802.1q         trunking  1
Port        Vlans allowed on trunk
Gi0/1       1,10,30',
 'Demonstration case supplied with the project brief. Not a collected lab capture.',
 'ACL denying inter-VLAN traffic between VLAN 10 and VLAN 30',
 'ACL', 'Layer 3/4', 'Inter-VLAN routing / ACL filtering', 'High', true),
('DEMO-002',
 'PC receives 169.254.x.x address and has no connectivity.',
 'PC -> Access Switch -> Router (DHCP server)',
 'PC2 set to DHCP; SW1 Fa0/2 access VLAN 20; R1 Gi0/0.20 192.168.20.1',
 'R1# show ip dhcp pool
Pool VLAN20 :
 Utilization mark (high/low)    : 100 / 0
 Total addresses               : 0
 Leased addresses              : 0

R1# show running-config | section dhcp
no service dhcp',
 'Demonstration case. Illustrates DHCP service disabled.',
 'DHCP service disabled / pool not defined so client falls back to APIPA',
 'DHCP', 'Layer 3', 'DHCP addressing', 'High', true),
('DEMO-003',
 'Two hosts on the same subnet report an IP address conflict message.',
 'PC-A and PC-B -> Access Switch',
 'PC-A: 192.168.1.20/24; PC-B: 192.168.1.20/24; GW 192.168.1.1',
 'PC-A> ipconfig
IP Address......: 192.168.1.20
Subnet Mask.....: 255.255.255.0
Default Gateway.: 192.168.1.1

PC-B> ipconfig
IP Address......: 192.168.1.20
Subnet Mask.....: 255.255.255.0
Default Gateway.: 192.168.1.1',
 'Demonstration case for the duplicate IP deterministic check.',
 'Duplicate statically assigned IP address',
 'Gateway', 'Layer 3', 'IP addressing / duplicate address', 'Medium', true),
('DEMO-004',
 'Host can ping its own subnet but nothing beyond the router.',
 'PC -> Switch -> Router -> WAN',
 'PC3: 192.168.5.10/24 GW 192.168.5.254; R1 Gi0/0 192.168.5.1/24',
 'PC3> ipconfig
IP Address......: 192.168.5.10
Subnet Mask.....: 255.255.255.0
Default Gateway.: 192.168.5.254

R1# show ip interface brief
GigabitEthernet0/0  192.168.5.1  YES manual up  up',
 'Demonstration case for the gateway mismatch deterministic check.',
 'Default gateway on the host does not match the router interface address',
 'Gateway', 'Layer 3', 'Default gateway configuration', 'Medium', true),
('DEMO-005',
 'Newly cabled workstation has no link and cannot obtain an address.',
 'PC -> Access Switch Fa0/5',
 'SW1 Fa0/5 access VLAN 10',
 'SW1# show ip interface brief
FastEthernet0/5   unassigned  YES unset administratively down down
FastEthernet0/6   unassigned  YES unset up                    up',
 'Demonstration case for the interface-down deterministic check.',
 'Switch access port administratively shut down',
 'VLAN', 'Layer 1/2', 'Interface state', 'High', true),
('DEMO-006',
 'Users in the sales VLAN cannot communicate with each other after a switch replacement.',
 'PC -> Access Switch (new) -> Router',
 'SW2 Fa0/1-Fa0/8 configured as access VLAN 40',
 'SW2# show vlan brief
VLAN Name      Status    Ports
1    default   active    Fa0/9, Fa0/10
10   staff     active    Fa0/11',
 'Demonstration case for the missing VLAN deterministic check.',
 'VLAN 40 not created in the VLAN database on the replacement switch',
 'VLAN', 'Layer 2', 'VLAN database / access port assignment', 'High', true),
('DEMO-007',
 'Branch users can reach the local gateway but not the headquarters network 10.20.0.0/16.',
 'Branch PC -> Branch Router -> WAN -> HQ Router',
 'R-Branch Gi0/0 192.168.30.1/24, Se0/0/0 10.1.1.2/30',
 'R-Branch# show ip route
C    192.168.30.0/24 is directly connected, GigabitEthernet0/0
C    10.1.1.0/30 is directly connected, Serial0/0/0',
 'Demonstration case for the missing route deterministic check.',
 'No static or dynamic route towards 10.20.0.0/16',
 'Routing', 'Layer 3', 'Static and dynamic routing', 'High', true),
('DEMO-008',
 'Wireless clients associate to the SSID but cannot resolve website names, while direct IP access works.',
 'Laptop -> Wireless Router -> ISP Router -> DNS Server',
 'Laptop DHCP: 192.168.0.101/24 GW 192.168.0.1 DNS 192.168.0.53',
 'Laptop> nslookup www.example.com
Server: 192.168.0.53
Request timed out.

Laptop> ping 203.0.113.10
Reply from 203.0.113.10: bytes=32 time=12ms',
 'Demonstration case combining wireless access and DNS resolution.',
 'DNS server address handed out by DHCP is unreachable or incorrect',
 'DNS', 'Layer 7', 'Name resolution', 'Medium', true);