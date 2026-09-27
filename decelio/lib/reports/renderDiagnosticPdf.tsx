import * as React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { ScanReport, ScanCoreResult } from '../scanner/core';
import {
  CMS_LABELS,
  FIREWALL_LABELS,
  collectUniqueCauses,
  matchReasons,
  type CmsKey,
  type FirewallKey,
  type PlatformGuidance,
  type RemediationCause,
} from '../remediation';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
    marginBottom: 20,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerText: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'right',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1F2937',
  },
  botResult: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
  },
  botName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#111827',
  },
  statusOk: {
    fontSize: 12,
    color: '#059669',
    fontWeight: 'bold',
  },
  statusError: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: 'bold',
  },
  statusWarning: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: 'bold',
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4B5563',
    marginTop: 5,
  },
  value: {
    fontSize: 10,
    color: '#374151',
  },
  causeBlock: {
    marginTop: 4,
    marginBottom: 4,
  },
  caveatText: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#92400E',
    marginTop: 2,
  },
  footerNote: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 8,
  },
  platformName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 6,
  },
  platformNote: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#6B7280',
    marginTop: 2,
  },
  unsupportedText: {
    fontSize: 10,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});

/** Aligné sur `SimpleStatus` (lib/scanner/core.ts) : les quatre verdicts sont déjà en français. */
const getStatusStyle = (status: string) => {
  if (status === 'OK') return styles.statusOk;
  if (status === 'BLOQUÉ' || status === 'ERREUR') return styles.statusError;
  return styles.statusWarning;
};

const formatDate = (dateString: string) => {
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

/** Ligne « Gravité : … · Effort estimé : … », en français. */
function formatSeverityEffort(cause: RemediationCause): string {
  return `Gravité : ${cause.severity} · Effort estimé : ${cause.effort}`;
}

/**
 * Bloc de correctif compact affiché sous chaque bot concerné : la cause en
 * français, ce qu'elle coûte au client, sa gravité/effort, et la nuance à
 * garder en tête pour les verdicts non établis (coquille vide, erreur). La
 * marche à suivre détaillée par plateforme est renvoyée en annexe pour ne
 * pas répéter onze fois la même liste dans chaque carte de bot.
 */
const CauseSummary = ({ cause }: { cause: RemediationCause }) => (
  <View style={styles.causeBlock}>
    <Text style={styles.value}>• {cause.title}</Text>
    <Text style={styles.value}>{cause.clientImpact}</Text>
    <Text style={styles.value}>{formatSeverityEffort(cause)}</Text>
    {cause.caveat && <Text style={styles.caveatText}>À noter : {cause.caveat}</Text>}
  </View>
);

/** Une entrée de correctif par plateforme (CMS ou pare-feu/hébergeur) dans l'annexe. */
const PlatformEntry = ({ label, guidance }: { label: string; guidance: PlatformGuidance }) => (
  <View style={styles.causeBlock}>
    <Text style={styles.platformName}>{label}</Text>
    {guidance.supported ? (
      guidance.steps.map((step, idx) => (
        <Text key={idx} style={styles.value}>
          – {step}
        </Text>
      ))
    ) : (
      <Text style={styles.unsupportedText}>Non pris en charge nativement par cette plateforme.</Text>
    )}
    {guidance.note && <Text style={styles.platformNote}>{guidance.note}</Text>}
    {guidance.unverified && (
      <Text style={styles.platformNote}>
        À vérifier : cette étape n&apos;a pas pu être confirmée par une source à jour au moment de la rédaction.
      </Text>
    )}
  </View>
);

/** Fiche complète d'une cause en annexe : titre, checklist générique, puis CMS et pare-feu concernés. */
const RemediationAppendixEntry = ({ cause }: { cause: RemediationCause }) => {
  const cmsEntries = (Object.entries(cause.cms ?? {}) as [CmsKey, PlatformGuidance][]).filter(
    ([, guidance]) => guidance !== undefined,
  );
  const firewallEntries = (Object.entries(cause.firewalls ?? {}) as [FirewallKey, PlatformGuidance][]).filter(
    ([, guidance]) => guidance !== undefined,
  );

  return (
    <View style={styles.botResult}>
      <Text style={styles.botName}>{cause.title}</Text>
      {cause.caveat && <Text style={styles.caveatText}>À noter : {cause.caveat}</Text>}
      {cause.generalSteps?.map((step, idx) => (
        <Text key={idx} style={styles.value}>
          • {step}
        </Text>
      ))}
      {cmsEntries.length > 0 && <Text style={styles.label}>Sur votre site (CMS / constructeur de site) :</Text>}
      {cmsEntries.map(([key, guidance]) => (
        <PlatformEntry key={key} label={CMS_LABELS[key]} guidance={guidance} />
      ))}
      {firewallEntries.length > 0 && (
        <Text style={styles.label}>Pare-feu, CDN ou hébergeur :</Text>
      )}
      {firewallEntries.map(([key, guidance]) => (
        <PlatformEntry key={key} label={FIREWALL_LABELS[key]} guidance={guidance} />
      ))}
    </View>
  );
};

const DiagnosticPdf = ({ report, results }: { report: ScanReport; results: ScanCoreResult[] }) => {
  const uniqueCauses = collectUniqueCauses(results.map((r) => r.reasons));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>Decelio.</Text>
          <View>
            <Text style={styles.headerText}>Rapport de lecture par les robots IA</Text>
            <Text style={styles.headerText}>{formatDate(report.scannedAt)}</Text>
          </View>
        </View>

        <Text style={styles.title}>Diagnostic pour {report.finalUrl}</Text>

        <View>
          {results.map((result) => (
            <View key={result.agent} style={styles.botResult}>
              <Text style={styles.botName}>{result.agent}</Text>
              <Text style={getStatusStyle(result.simpleStatus)}>Statut : {result.simpleStatus}</Text>

              {result.reasons && result.reasons.length > 0 && (
                <>
                  <Text style={styles.label}>Cause :</Text>
                  {matchReasons(result.reasons).map((cause) => (
                    <CauseSummary key={cause.id} cause={cause} />
                  ))}
                  <Text style={styles.footerNote}>
                    La marche à suivre détaillée, plateforme par plateforme, figure en annexe à la fin de ce rapport.
                  </Text>
                </>
              )}
            </View>
          ))}
        </View>

        {uniqueCauses.length > 0 && (
          <View>
            <Text style={styles.title}>Annexe — Comment corriger, plateforme par plateforme</Text>
            <Text style={styles.footerNote}>
              Cette annexe rassemble, une seule fois, la marche à suivre pour chaque cause détectée ci-dessus, pour les
              principaux CMS, constructeurs de site, pare-feu et hébergeurs. Appliquez uniquement la section qui
              correspond à votre situation.
            </Text>
            {uniqueCauses.map((cause) => (
              <RemediationAppendixEntry key={cause.id} cause={cause} />
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
};

export async function generateDiagnosticPdfBuffer(report: ScanReport, results: ScanCoreResult[]): Promise<Buffer> {
  const buffer = await renderToBuffer(<DiagnosticPdf report={report} results={results} />);
  return buffer;
}
