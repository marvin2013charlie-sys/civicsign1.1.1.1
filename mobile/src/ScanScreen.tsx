import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator, NativeModules, SafeAreaView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import {CivicSignApi} from './api';
import {accessKeyFromMrz, accessKeyLooksValid} from './mrzKey';

const {CivicSignPassport} = NativeModules;

type Props = {baseUrl: string; token: string};
type Stage = 'enter' | 'waiting' | 'checking' | 'done' | 'failed';

export function ScanScreen({baseUrl, token}: Props) {
  const [mrz, setMrz] = useState('');
  const [stage, setStage] = useState<Stage>('enter');
  const [message, setMessage] = useState('');

  const scan = useCallback(async () => {
    const api = new CivicSignApi(baseUrl, token);
    let key;
    try {
      key = accessKeyFromMrz(mrz);
    } catch (e: any) {
      setMessage(e.message);
      return;
    }
    if (!accessKeyLooksValid(key)) {
      setMessage('Those details do not match their check digits — read the page again');
      return;
    }

    setStage('waiting');
    setMessage('Hold the top of your phone against the passport photo page');
    try {
      await api.start();
      const read = await CivicSignPassport.read(
        key.documentNumber, key.dateOfBirth, key.dateOfExpiry,
      );
      setStage('checking');
      setMessage('Checking the chip with CivicSign');
      const result = await api.submitChip(read);
      if (result.status === 'verified') {
        setStage('done');
        setMessage('Identity verified. Return to the document to sign.');
      } else {
        setStage('failed');
        setMessage(result.failure_reason ?? 'The chip could not be verified');
      }
    } catch (e: any) {
      setStage('failed');
      setMessage(e.message ?? 'Could not read the chip');
    }
  }, [baseUrl, token, mrz]);

  const busy = stage === 'waiting' || stage === 'checking';

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Verify your identity</Text>
      <Text style={styles.body}>
        Type the two lines printed at the bottom of your passport photo page, then hold
        your phone against the page. Your passport details stay on this phone and in
        CivicSign's check — the chip's photograph is never stored.
      </Text>

      <TextInput
        style={styles.input}
        multiline
        numberOfLines={3}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={'P<GBRPATEL<<SIAN<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n1234567897GBR9001011F3504152<<<<<<<<<<<<<<02'}
        value={mrz}
        onChangeText={setMrz}
        editable={!busy && stage !== 'done'}
      />

      {stage !== 'done' && (
        <TouchableOpacity
          style={[styles.button, (busy || mrz.trim().length < 20) && styles.buttonOff]}
          onPress={scan}
          disabled={busy || mrz.trim().length < 20}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Scan passport</Text>}
        </TouchableOpacity>
      )}

      {!!message && (
        <View style={[styles.note, stage === 'failed' && styles.noteBad, stage === 'done' && styles.noteGood]}>
          <Text style={styles.noteText}>{message}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, padding: 24, backgroundColor: '#F8F7F2', gap: 16},
  title: {fontSize: 26, fontWeight: '700', color: '#122120'},
  body: {fontSize: 15, lineHeight: 22, color: '#5C6B73'},
  input: {
    borderWidth: 1, borderColor: '#E1DDD1', borderRadius: 12, padding: 12,
    fontFamily: 'monospace', fontSize: 12, backgroundColor: '#FCFBF7',
    color: '#122120', textAlignVertical: 'top',
  },
  button: {backgroundColor: '#0D9488', borderRadius: 12, padding: 16, alignItems: 'center'},
  buttonOff: {opacity: 0.5},
  buttonText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  note: {borderRadius: 12, padding: 14, backgroundColor: '#F0EEE6'},
  noteBad: {backgroundColor: '#FDECEC'},
  noteGood: {backgroundColor: '#EAF7EE'},
  noteText: {fontSize: 14, color: '#122120'},
});
