import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import '../core/legal_links.dart';

const _brandOrange = Color(0xFFCF6A12);
const _ink = Color(0xFF2F241C);
const _muted = Color(0xFF71675F);

class SignInScreen extends StatefulWidget {
  const SignInScreen({required this.controller, super.key});

  final AppController controller;

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final PageController _pageController = PageController();
  late final TapGestureRecognizer _termsRecognizer;
  late final TapGestureRecognizer _privacyRecognizer;
  int _page = 0;
  bool _acceptedTerms = false;

  static const _introductions = [
    _Introduction(
      label: '01 / POIN AKADEMIK',
      title: 'Setiap kontribusi\npunya tempat.',
      description:
          'Pantau poin, laporan, dan peringkat kegiatan kuliah dalam satu aplikasi. PJ mata kuliah dapat mencatat kontribusi kelas dengan mudah.',
      icon: Icons.insights_rounded,
      detailIcon: Icons.auto_graph_rounded,
      detail: 'Poin & laporan',
    ),
    _Introduction(
      label: '02 / GRUP KELAS',
      title: 'Percakapan kelas\ntetap dekat.',
      description:
          'Diskusikan mata kuliah bersama teman sekelas di ruang yang sesuai dengan kelasmu. Informasi penting lebih mudah ditemukan.',
      icon: Icons.forum_rounded,
      detailIcon: Icons.groups_rounded,
      detail: 'Ruang kelasmu',
    ),
    _Introduction(
      label: '03 / KARSA LIB',
      title: 'Ilmu tumbuh\nsaat dibagikan.',
      description:
          'Baca artikel dari teman satu program studi. Ingin menulis juga? Ajukan akses penulis dan bagikan pengetahuanmu.',
      icon: Icons.auto_stories_rounded,
      detailIcon: Icons.edit_note_rounded,
      detail: 'Cerita satu prodi',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _termsRecognizer = TapGestureRecognizer()
      ..onTap = () => openLegalDocument(context, termsPath);
    _privacyRecognizer = TapGestureRecognizer()
      ..onTap = () => openLegalDocument(context, privacyPath);
  }

  @override
  void dispose() {
    _pageController.dispose();
    _termsRecognizer.dispose();
    _privacyRecognizer.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (MediaQuery.disableAnimationsOf(context)) {
      _pageController.jumpToPage((_page + 1) % _introductions.length);
      return;
    }
    _pageController.animateToPage(
      (_page + 1) % _introductions.length,
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final busy = widget.controller.state == SessionState.authenticating;

    return Scaffold(
      backgroundColor: const Color(0xFFFCF8F2),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 18, 24, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Image.asset(
                      'assets/icon.png',
                      width: 48,
                      height: 48,
                      semanticLabel: 'Logo SiKarsa',
                    ),
                  ),
                  const SizedBox(width: 11),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('SiKarsa', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: _ink, height: 1)),
                      SizedBox(height: 4),
                      Text('UNTIDAR', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 2, color: _brandOrange)),
                    ],
                  ),
                  const Spacer(),
                  const Icon(Icons.school_outlined, size: 21, color: _brandOrange),
                ],
              ),
              const SizedBox(height: 22),
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: _introductions.length,
                  onPageChanged: (index) => setState(() => _page = index),
                  itemBuilder: (context, index) => _IntroductionPage(introduction: _introductions[index]),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  for (var index = 0; index < _introductions.length; index++)
                    AnimatedContainer(
                      duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 180),
                      margin: const EdgeInsets.only(right: 6),
                      width: index == _page ? 25 : 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: index == _page ? _brandOrange : const Color(0xFFE5D7C9),
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: _nextPage,
                    iconAlignment: IconAlignment.end,
                    icon: const Icon(Icons.arrow_forward_rounded, size: 17),
                    label: Text(_page == _introductions.length - 1 ? 'Ulangi' : 'Berikutnya'),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.fromLTRB(5, 8, 12, 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: const Color(0xFFEADBC9)),
                  borderRadius: BorderRadius.circular(17),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Checkbox(
                      value: _acceptedTerms,
                      onChanged: busy ? null : (value) => setState(() => _acceptedTerms = value ?? false),
                      shape: const CircleBorder(),
                      activeColor: _brandOrange,
                      semanticLabel: 'Saya menyetujui Syarat Penggunaan dan memahami Kebijakan Privasi',
                    ),
                    Expanded(
                      child: Text.rich(
                        TextSpan(
                          style: const TextStyle(fontSize: 12, height: 1.45, color: _ink),
                          children: [
                            const TextSpan(text: 'Saya telah membaca dan menyetujui '),
                            TextSpan(
                              text: 'Syarat Penggunaan',
                              style: const TextStyle(color: _brandOrange, fontWeight: FontWeight.w700, decoration: TextDecoration.underline),
                              recognizer: _termsRecognizer,
                            ),
                            const TextSpan(text: ', serta memahami '),
                            TextSpan(
                              text: 'Kebijakan Privasi',
                              style: const TextStyle(color: _brandOrange, fontWeight: FontWeight.w700, decoration: TextDecoration.underline),
                              recognizer: _privacyRecognizer,
                            ),
                            const TextSpan(text: ' SiKarsa.'),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (widget.controller.error != null) ...[
                const SizedBox(height: 8),
                MaterialBanner(
                  content: Text(widget.controller.error!),
                  actions: [TextButton(onPressed: widget.controller.clearError, child: const Text('Tutup'))],
                ),
              ],
              const SizedBox(height: 11),
              SizedBox(
                height: 54,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: _brandOrange,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: busy || !_acceptedTerms
                      ? null
                      : () => widget.controller.signIn(termsAccepted: _acceptedTerms),
                  icon: busy
                      ? const SizedBox.square(dimension: 19, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.login_rounded),
                  label: Text(busy ? (widget.controller.waitingForBrowser ? 'Menunggu login di browser…' : 'Menyiapkan akun…') : 'Masuk dengan Google'),
                ),
              ),
              if (widget.controller.waitingForBrowser)
                TextButton(
                  onPressed: widget.controller.cancelSignIn,
                  child: const Text('Batalkan proses masuk'),
                ),
              const SizedBox(height: 11),
              const Text(
                'Gunakan akun @students.untidar.ac.id. Login berlangsung melalui browser; kata sandi Google tidak disimpan di aplikasi.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, height: 1.4, color: _muted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Introduction {
  const _Introduction({
    required this.label,
    required this.title,
    required this.description,
    required this.icon,
    required this.detailIcon,
    required this.detail,
  });

  final String label;
  final String title;
  final String description;
  final IconData icon;
  final IconData detailIcon;
  final String detail;
}

class _IntroductionPage extends StatelessWidget {
  const _IntroductionPage({required this.introduction});

  final _Introduction introduction;

  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, constraints) {
    final visualHeight = (constraints.maxHeight * .54).clamp(155.0, 235.0).toDouble();
    return SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: double.infinity,
              height: visualHeight,
              child: Container(
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  color: _brandOrange,
                  borderRadius: BorderRadius.circular(30),
                ),
                child: Stack(
                  children: [
                    Positioned(
                      right: -65,
                      top: -85,
                      child: Container(
                        width: 250,
                        height: 250,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white.withValues(alpha: .14), width: 42),
                        ),
                      ),
                    ),
                    Positioned(
                      left: -75,
                      bottom: -110,
                      child: Container(
                        width: 260,
                        height: 260,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white.withValues(alpha: .10), width: 44),
                        ),
                      ),
                    ),
                    Center(
                      child: Icon(introduction.icon, size: 112, color: Colors.white.withValues(alpha: .93)),
                    ),
                    Positioned(
                      left: 22,
                      bottom: 22,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF8EE),
                          borderRadius: BorderRadius.circular(13),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(introduction.detailIcon, size: 17, color: _brandOrange),
                            const SizedBox(width: 7),
                            Text(introduction.detail, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _ink)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 25),
            Text(
              introduction.label,
              style: const TextStyle(color: _brandOrange, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.5),
            ),
            const SizedBox(height: 9),
            Text(
              introduction.title,
              style: const TextStyle(fontSize: 31, height: 1.08, letterSpacing: -.7, fontWeight: FontWeight.w800, color: _ink),
            ),
            const SizedBox(height: 12),
            Text(
              introduction.description,
              style: const TextStyle(fontSize: 14, height: 1.55, color: _muted),
            ),
            const SizedBox(height: 12),
          ],
        ),
      );
  });
}
