import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../core/pending_submission.dart';
import '../core/student_search.dart';
import '../widgets/common.dart';

class PointFormScreen extends StatefulWidget {
  const PointFormScreen({required this.api, super.key});
  final ApiClient api;

  @override
  State<PointFormScreen> createState() => _PointFormScreenState();
}

class _PointFormScreenState extends State<PointFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _noteController = TextEditingController();
  final _studentSearchController = TextEditingController();
  final _studentSearchFocusNode = FocusNode();
  final _submission = PendingSubmission();
  int _studentRequestVersion = 0;
  List<Assignment>? _assignments;
  List<Student>? _students;
  List<PointCategory>? _categories;
  Assignment? _assignment;
  Student? _student;
  PointCategory? _category;
  int _points = 1;
  bool _loading = true;
  bool _loadingStudents = false;
  bool _submitting = false;
  bool _showNote = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _noteController.dispose();
    _studentSearchController.dispose();
    _studentSearchFocusNode.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        widget.api.assignments(),
        widget.api.categories(),
      ]);
      _assignments = results[0] as List<Assignment>;
      _categories = results[1] as List<PointCategory>;
    } catch (error) {
      _error = error;
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _chooseAssignment(Assignment? value) async {
    final requestVersion = ++_studentRequestVersion;
    _studentSearchController.clear();
    _noteController.clear();
    _studentSearchFocusNode.unfocus();
    setState(() {
      _assignment = value;
      _student = null;
      _category = null;
      _points = 1;
      _showNote = false;
      _students = null;
      _loadingStudents = value != null;
    });
    if (value == null) {
      return;
    }
    try {
      final students = await widget.api.students(value.id);
      if (mounted && requestVersion == _studentRequestVersion) {
        setState(
          () => _students = students.where((item) => !item.isSelf).toList(),
        );
      }
    } catch (error) {
      if (mounted && requestVersion == _studentRequestVersion) {
        _show(friendlyError(error));
      }
    } finally {
      if (mounted && requestVersion == _studentRequestVersion) {
        setState(() => _loadingStudents = false);
      }
    }
  }

  Future<void> _submit() async {
    if (_submitting) return;
    if (_assignment == null || _student == null || _category == null || !_formKey.currentState!.validate()) {
      _show('Lengkapi mata kuliah, mahasiswa, dan kategori.');
      return;
    }
    final studentName = _student!.name;
    final savedPoints = _points;
    setState(() => _submitting = true);
    try {
      final note = _noteController.text.trim();
      final key = _submission.keyFor({
        'assignment': _assignment!.id,
        'student': _student!.id,
        'category': _category!.id,
        'points': _points,
        'note': note,
      });
      await widget.api.createPoint(
        assignmentId: _assignment!.id,
        studentId: _student!.id,
        categoryId: _category!.id,
        points: _points,
        note: note,
        idempotencyKey: key,
      );
      _submission.complete();
      if (!mounted) {
        return;
      }
      _noteController.clear();
      _studentSearchController.clear();
      setState(() {
        _student = null;
        _category = null;
        _points = 1;
        _showNote = false;
      });
      _show('$savedPoints poin berhasil dicatat untuk $studentName.', success: true);
    } catch (error) {
      if (mounted) {
        _show(friendlyError(error));
      }
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  void _show(String message, {bool success = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: success ? Colors.green.shade700 : null,
      ),
    );
  }

  String _studentLabel(Student student) => student.nim == null
      ? student.name
      : '${student.name} · ${studentNimLabel(student.nim)}';

  String _studentSearchHelper() {
    if (_assignment == null) {
      return 'Pilih mata kuliah terlebih dahulu.';
    }
    if ((_students ?? const <Student>[]).isEmpty) {
      return 'Tidak ada mahasiswa yang dapat dipilih.';
    }
    final query = _studentSearchController.text.trim();
    if (query.length < 2 ||
        (!RegExp(r'^[0-9]+$').hasMatch(query) && query.length < 3)) {
      return 'Ketik minimal 3 huruf nama atau 2 digit akhir NIM.';
    }
    if (searchStudents(_students!, query).isEmpty) {
      return 'Tidak ada mahasiswa yang cocok.';
    }
    return 'Pilih mahasiswa dari hasil yang muncul.';
  }

  @override
  Widget build(BuildContext context) => Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 15, 20, 14),
            decoration: const BoxDecoration(
              color: KarsaColors.background,
              border: Border(bottom: BorderSide(color: KarsaColors.border)),
            ),
            child: Row(
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Input poin', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                      SizedBox(height: 2),
                      Text('Catat kontribusi mahasiswa', style: TextStyle(fontSize: 12, color: KarsaColors.muted)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF0E2),
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: const Text('PJ KELAS', style: TextStyle(
                    color: KarsaColors.orange, fontSize: 11, fontWeight: FontWeight.w800,
                  )),
                ),
              ],
            ),
          ),
          Expanded(child: _body(context)),
        ],
      );

  Widget _body(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return ErrorState(message: friendlyError(_error!), onRetry: _load);
    }
    if (_assignments!.isEmpty) {
      return const EmptyState(
        title: 'Belum ada penugasan PJ',
        message: 'Penugasan mata kuliah dapat ditambahkan melalui dashboard admin web.',
        icon: Icons.school_outlined,
      );
    }
    return Column(children: [
      Expanded(child: LayoutBuilder(builder: (context, constraints) {
        final minHeight = constraints.maxHeight > 24 ? constraints.maxHeight - 24 : 0.0;
        return SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: minHeight),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: AnimatedSize(
                  duration: MediaQuery.of(context).disableAnimations
                      ? Duration.zero : const Duration(milliseconds: 220),
                  curve: Curves.easeOutCubic,
                  alignment: Alignment.center,
                  child: Card(
                    margin: EdgeInsets.zero,
                    color: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                      side: const BorderSide(color: KarsaColors.border),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Form(
                        key: _formKey,
                        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(children: [
              const Icon(Icons.auto_awesome_rounded, color: KarsaColors.orange, size: 28),
              const SizedBox(width: 10),
              const Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Pilih mata kuliah', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                  SizedBox(height: 3),
                  Text('Mulai dari kelas yang kamu ampu.', style: TextStyle(fontSize: 12, color: KarsaColors.muted)),
                ],
              )),
              if (_assignment != null) TextButton(
                onPressed: _submitting ? null : () { _chooseAssignment(null); },
                child: const Text('Ulangi'),
              ),
            ]),
            const SizedBox(height: 18),
            DropdownButtonFormField<Assignment>(
              key: ValueKey(_assignment?.id ?? 'no-assignment'),
              initialValue: _assignment,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Mata kuliah'),
              items: _assignments!
                  .map((item) => DropdownMenuItem(value: item, child: Text('${item.courseName} · ${item.className}')))
                  .toList(),
              onChanged: _submitting ? null : _chooseAssignment,
              validator: (value) => value == null ? 'Pilih mata kuliah' : null,
            ),
            if (_assignment != null && _student == null) ...[
            const SizedBox(height: 18),
            const Divider(height: 1),
            const SizedBox(height: 15),
            Text('Cari mahasiswa', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 8),
            if (_loadingStudents)
              const LinearProgressIndicator()
            else
              RawAutocomplete<Student>(
                textEditingController: _studentSearchController,
                focusNode: _studentSearchFocusNode,
                displayStringForOption: _studentLabel,
                optionsBuilder: (textValue) => searchStudents(
                  _students ?? const <Student>[],
                  textValue.text,
                ),
                onSelected: (student) {
                  _studentSearchFocusNode.unfocus();
                  _studentSearchController.clear();
                  setState(() {
                    _student = student;
                    _category = null;
                    _points = 1;
                  });
                },
                fieldViewBuilder: (
                  context,
                  controller,
                  focusNode,
                  onFieldSubmitted,
                ) => TextFormField(
                  controller: controller,
                  focusNode: focusNode,
                  enabled: _assignment != null && !_submitting,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Nama, NIM, atau 2–4 digit terakhir',
                    helperText: _studentSearchHelper(),
                    prefixIcon: const Icon(Icons.search_rounded),
                    suffixIcon: controller.text.isEmpty
                        ? null
                        : IconButton(
                            tooltip: 'Hapus pencarian',
                            onPressed: () {
                              controller.clear();
                              setState(() => _student = null);
                              focusNode.requestFocus();
                            },
                            icon: const Icon(Icons.close_rounded),
                          ),
                  ),
                  onChanged: (_) => setState(() => _student = null),
                  onFieldSubmitted: (_) => onFieldSubmitted(),
                  validator: (_) => _student == null
                      ? 'Cari lalu pilih mahasiswa dari hasil pencarian'
                      : null,
                ),
                optionsViewBuilder: (context, onSelected, options) {
                  final matches = options.toList();
                  return Align(
                    alignment: Alignment.topLeft,
                    child: Material(
                      elevation: 8,
                      borderRadius: BorderRadius.circular(14),
                      clipBehavior: Clip.antiAlias,
                      child: SizedBox(
                        width: MediaQuery.sizeOf(context).width - 32,
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxHeight: 280),
                          child: ListView.separated(
                            padding: EdgeInsets.zero,
                            shrinkWrap: true,
                            itemCount: matches.length,
                            separatorBuilder: (_, _) => const Divider(height: 1),
                            itemBuilder: (context, index) {
                              final student = matches[index];
                              return ListTile(
                                leading: const CircleAvatar(
                                  child: Icon(Icons.person_outline_rounded),
                                ),
                                title: Text(student.name),
                                subtitle: Text(studentNimLabel(student.nim)),
                                onTap: () => onSelected(student),
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ],
            if (_student != null) ...[
              const SizedBox(height: 18),
              const Divider(height: 1),
              Row(children: [
                Expanded(child: Text('Mahasiswa terpilih', style: Theme.of(context).textTheme.labelLarge)),
                TextButton(
                  onPressed: _submitting ? null : () {
                    _studentSearchController.clear();
                    _noteController.clear();
                    setState(() {
                      _student = null;
                      _category = null;
                      _points = 1;
                      _showNote = false;
                    });
                  },
                  child: const Text('Ganti'),
                ),
              ]),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF0E2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(children: [
                  InitialAvatar(name: _student!.name, radius: 17),
                  const SizedBox(width: 9),
                  Expanded(child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_student!.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      Text(studentNimLabel(_student!.nim),
                        style: const TextStyle(fontSize: 11, color: KarsaColors.muted)),
                    ],
                  )),
                ]),
              ),
              const SizedBox(height: 18),
              const Divider(height: 1),
              const SizedBox(height: 15),
            ],
            if (_student != null) ...[
            const SectionHeading(title: 'Input poin', subtitle: 'Pilih kategori dan jumlah poin.'),
            const SizedBox(height: 14),
            _pointInputs(context),
            const SizedBox(height: 9),
            TextButton.icon(
              onPressed: _submitting ? null : () => setState(() => _showNote = !_showNote),
              icon: Icon(_showNote ? Icons.expand_less_rounded : Icons.add_rounded),
              label: Text(_showNote ? 'Sembunyikan catatan' : 'Catatan (opsional)'),
            ),
            if (_showNote) TextFormField(
              controller: _noteController,
              enabled: !_submitting,
              maxLength: 500,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Catatan (Opsional)',
                alignLabelWithHint: true,
              ),
            ),
            if (!_showNote && _noteController.text.trim().isNotEmpty)
              Text('Catatan akan disertakan: ${_noteController.text.trim()}',
                maxLines: 2, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
            ],
          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      })),
      if (_student != null) Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: KarsaColors.border)),
        ),
        child: SizedBox(width: double.infinity, height: 52,
          child: FilledButton.icon(
            onPressed: _submitting || _category == null ? null : _submit,
            icon: _submitting
                ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.check_rounded),
            label: Text(_submitting ? 'Menyimpan…' : 'Input poin'),
          ),
        ),
      ),
    ]);
  }

  Widget _pointInputs(BuildContext context) {
    final category = DropdownButtonFormField<PointCategory>(
      initialValue: _category,
      isExpanded: true,
      decoration: const InputDecoration(labelText: 'Kategori'),
      items: _categories!
          .map((item) => DropdownMenuItem(
            value: item, child: Text(item.name, overflow: TextOverflow.ellipsis),
          ))
          .toList(),
      onChanged: _submitting ? null : (value) => setState(() => _category = value),
      validator: (value) => value == null ? 'Pilih kategori' : null,
    );
    final points = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('Jumlah poin', style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 5),
        Wrap(spacing: 5, children: [
          for (var point = 1; point <= 4; point++)
            ChoiceChip(
              label: Text('$point'),
              selected: _points == point,
              visualDensity: VisualDensity.compact,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              onSelected: _submitting ? null : (_) => setState(() => _points = point),
            ),
        ]),
      ],
    );
    return LayoutBuilder(builder: (context, constraints) =>
      constraints.maxWidth < 355
        ? Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [category, const SizedBox(height: 12), points],
          )
        : Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [Expanded(child: category), const SizedBox(width: 12), points],
          ),
    );
  }
}
