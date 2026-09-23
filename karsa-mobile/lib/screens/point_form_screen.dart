import 'dart:math';

import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
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
      if (_categories!.isNotEmpty) {
        _category = _categories!.first;
      }
    } catch (error) {
      _error = error;
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _chooseAssignment(Assignment? value) async {
    _studentSearchController.clear();
    setState(() {
      _assignment = value;
      _student = null;
      _students = null;
      _loadingStudents = value != null;
    });
    if (value == null) {
      return;
    }
    try {
      final students = await widget.api.students(value.id);
      if (mounted) {
        setState(
          () => _students = students.where((item) => !item.isSelf).toList(),
        );
      }
    } catch (error) {
      if (mounted) {
        _show(friendlyError(error));
      }
    } finally {
      if (mounted) {
        setState(() => _loadingStudents = false);
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _assignment == null || _student == null || _category == null) {
      _show('Lengkapi mata kuliah, mahasiswa, dan kategori.');
      return;
    }
    setState(() => _submitting = true);
    try {
      final nonce = Random.secure().nextInt(1 << 32).toRadixString(16);
      final message = await widget.api.createPoint(
        assignmentId: _assignment!.id,
        studentId: _student!.id,
        categoryId: _category!.id,
        points: _points,
        note: _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
        idempotencyKey: '${DateTime.now().microsecondsSinceEpoch}-$nonce-mobile',
      );
      if (!mounted) {
        return;
      }
      _noteController.clear();
      _studentSearchController.clear();
      setState(() => _student = null);
      _show(message, success: true);
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
      : '${student.name} · ${student.nim}';

  String _studentSearchHelper() {
    if (_assignment == null) {
      return 'Pilih mata kuliah terlebih dahulu.';
    }
    if ((_students ?? const <Student>[]).isEmpty) {
      return 'Tidak ada mahasiswa yang dapat dipilih.';
    }
    final query = _studentSearchController.text.trim();
    if (query.length < 3) {
      return 'Ketik minimal 3 huruf nama mahasiswa.';
    }
    if (searchStudentsByName(_students!, query).isEmpty) {
      return 'Tidak ada nama yang cocok.';
    }
    return 'Pilih mahasiswa dari hasil yang muncul.';
  }

  @override
  Widget build(BuildContext context) => CustomScrollView(
        slivers: [
          const SliverAppBar(title: Text('Catat poin')),
          SliverFillRemaining(hasScrollBody: true, child: _body(context)),
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
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Detail pencatatan', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 6),
            const Text('Pastikan mahasiswa dan mata kuliah sudah tepat sebelum menyimpan.'),
            const SizedBox(height: 20),
            DropdownButtonFormField<Assignment>(
              initialValue: _assignment,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Mata kuliah'),
              items: _assignments!
                  .map((item) => DropdownMenuItem(value: item, child: Text('${item.courseName} · ${item.className}')))
                  .toList(),
              onChanged: _submitting ? null : _chooseAssignment,
              validator: (value) => value == null ? 'Pilih mata kuliah' : null,
            ),
            const SizedBox(height: 14),
            if (_loadingStudents)
              const LinearProgressIndicator()
            else
              RawAutocomplete<Student>(
                textEditingController: _studentSearchController,
                focusNode: _studentSearchFocusNode,
                displayStringForOption: _studentLabel,
                optionsBuilder: (textValue) => searchStudentsByName(
                  _students ?? const <Student>[],
                  textValue.text,
                ),
                onSelected: (student) => setState(() => _student = student),
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
                    labelText: 'Cari mahasiswa',
                    hintText: 'Contoh: wil',
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
                      ? 'Ketik nama lalu pilih mahasiswa dari hasil pencarian'
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
                                subtitle: student.nim == null
                                    ? null
                                    : Text(student.nim!),
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
            const SizedBox(height: 14),
            DropdownButtonFormField<PointCategory>(
              initialValue: _category,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Kategori'),
              items: _categories!
                  .map((item) => DropdownMenuItem(value: item, child: Text(item.name)))
                  .toList(),
              onChanged: _submitting ? null : (value) => setState(() => _category = value),
              validator: (value) => value == null ? 'Pilih kategori' : null,
            ),
            const SizedBox(height: 20),
            Text('Jumlah poin', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 10),
            SegmentedButton<int>(
              segments: const [
                ButtonSegment(value: 1, label: Text('1')),
                ButtonSegment(value: 2, label: Text('2')),
                ButtonSegment(value: 3, label: Text('3')),
                ButtonSegment(value: 4, label: Text('4')),
              ],
              selected: {_points},
              onSelectionChanged: _submitting ? null : (value) => setState(() => _points = value.first),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _noteController,
              enabled: !_submitting,
              maxLength: 500,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Catatan (opsional)',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: FilledButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.check_rounded),
                label: Text(_submitting ? 'Menyimpan…' : 'Simpan poin'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
