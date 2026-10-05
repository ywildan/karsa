import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from mobile_release import build_config, normalize_origin
from verify_mobile_apk import signing_certificate, verify_metadata, verify_manifest_security


class ReleaseGuardsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.pubspec = Path(self.temp.name) / 'pubspec.yaml'
        self.pubspec.write_text('name: karsa_mobile\nversion: 2.0.8+10\n')
        self.env = dict(GITHUB_REF='refs/heads/main', GITHUB_EVENT_NAME='workflow_dispatch',
                        GITHUB_RUN_NUMBER='65', PUBLISH_RELEASE='true')

    def test_manual_production_release(self):
        self.env['API_BASE_URL_INPUT'] = 'https://WWW.SIKARSA.ID:443/'
        result = build_config(self.env, self.pubspec)
        self.assertEqual(result['api_base_url'], 'https://www.sikarsa.id')
        self.assertEqual(result['tag'], 'karsa-v2.0.8')
        self.assertEqual(result['publish'], 'true')
        self.assertEqual(result['sign_release'], 'true')

    def test_staging_cannot_publish_or_use_production_signing(self):
        self.env['API_BASE_URL_INPUT'] = 'https://staging.example.com'
        with self.assertRaises(ValueError):
            build_config(self.env, self.pubspec)
        self.env['PUBLISH_RELEASE'] = 'false'
        result = build_config(self.env, self.pubspec)
        self.assertEqual((result['publish'], result['sign_release']), ('false', 'false'))

    def test_pr_and_feature_cannot_publish_or_sign(self):
        for event, ref in [('pull_request', 'refs/pull/42/merge'),
                           ('workflow_dispatch', 'refs/heads/fix/session'),
                           ('pull_request', 'refs/heads/main')]:
            with self.subTest(event=event, ref=ref):
                self.env.update(GITHUB_EVENT_NAME=event, GITHUB_REF=ref)
                with self.assertRaises(ValueError):
                    build_config(self.env, self.pubspec)
                self.env['PUBLISH_RELEASE'] = 'false'
                self.assertEqual(build_config(self.env, self.pubspec)['sign_release'], 'false')
                self.env['PUBLISH_RELEASE'] = 'true'

    def test_push_only_validates_and_builds(self):
        self.env.update(GITHUB_EVENT_NAME='push', PUBLISH_RELEASE='false')
        self.assertEqual(build_config(self.env, self.pubspec)['publish'], 'false')

    def test_shell_credentials_paths_and_cleartext_are_rejected(self):
        for value in ['http://www.sikarsa.id', 'https://example.com$(printf hacked)',
                      'https://example.com`id`', 'https://user:pass@example.com',
                      'https://example.com/api', 'https://example.com?q=1',
                      'https://example.com/#fragment', 'https://example.com\n',
                      'https://example.com:99999', 'https://example.com --other-flag']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                normalize_origin(value)

    def test_missing_version_and_invalid_build_counter_fail(self):
        for value in ['2.0.8', 'latest+10', '2.0.8+0', '2.0.8+10\nversion: 2.0.9+11']:
            self.pubspec.write_text(f'version: {value}\n')
            with self.subTest(version=value), self.assertRaises(ValueError):
                build_config(self.env, self.pubspec)
        self.pubspec.write_text('version: 2.0.8+10\n')
        self.env['GITHUB_RUN_NUMBER'] = '65; echo injected'
        with self.assertRaises(ValueError):
            build_config(self.env, self.pubspec)


class ApkCompatibilityTest(unittest.TestCase):
    def setUp(self):
        self.cert = 'a' * 64
        self.badging = "package: name='ac.id.untidar.karsa_mobile' versionCode='2065' versionName='2.0.8'\nsdkVersion:'24'\nnative-code: 'arm64-v8a'\n"
        self.signature = f'Number of signers: 1\nSigner #1 certificate SHA-256 digest: {self.cert}\n'

    def test_v31_sdk_range_certificates(self):
        signature = ('Number of signers: 1\n'
                     f'Signer (minSdkVersion=33, maxSdkVersion=2147483647) certificate SHA-256 digest: {self.cert}\n'
                     f'Signer (minSdkVersion=24, maxSdkVersion=32) certificate SHA-256 digest: {self.cert}\n')
        self.assertEqual(signing_certificate(signature), self.cert)
        with self.assertRaises(ValueError):
            signing_certificate(signature.replace(self.cert, 'b' * 64, 1))
        with self.assertRaises(ValueError):
            signing_certificate(signature.replace('Number of signers: 1', 'Number of signers: 2'))

    def test_expected_install_metadata(self):
        verify_metadata(self.badging, self.signature, '2.0.8', 2065, 'arm64-v8a', self.cert)

    def test_manifest_must_disable_backup_and_flutter_deep_links(self):
        tree = '''E: application
          A: android:allowBackup(0x01010280)=(type 0x12)0x0
          E: activity
            E: meta-data
              A: android:name(0x01010003)="flutter_deeplinking_enabled" (Raw: "flutter_deeplinking_enabled")
              A: android:value(0x01010024)=(type 0x12)0x0
        '''
        verify_manifest_security(tree)
        with self.assertRaises(ValueError):
            verify_manifest_security(tree.replace('flutter_deeplinking_enabled', 'flutterEmbedding'))
        with self.assertRaises(ValueError):
            verify_manifest_security(tree.replace('(type 0x12)0x0', '(type 0x12)0xffffffff'))

    def test_changed_signer_package_version_or_abi_is_rejected(self):
        for old, new in [('karsa_mobile', 'other_app'), ('2065', '2064'),
                         ('2.0.8', '2.0.7'), ("sdkVersion:'24'", "sdkVersion:'23'"),
                         ('arm64-v8a', 'armeabi-v7a')]:
            with self.subTest(change=new), self.assertRaises(ValueError):
                verify_metadata(self.badging.replace(old, new), self.signature, '2.0.8', 2065, 'arm64-v8a', self.cert)
        with self.assertRaises(ValueError):
            verify_metadata(self.badging, self.signature, '2.0.8', 2065, 'arm64-v8a', 'b' * 64)
        with self.assertRaises(ValueError):
            verify_metadata(self.badging, self.signature.replace('Number of signers: 1', 'Number of signers: 2'), '2.0.8', 2065, 'arm64-v8a', self.cert)


if __name__ == '__main__':
    unittest.main()
