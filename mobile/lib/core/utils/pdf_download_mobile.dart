import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';

Future<void> saveAndOpenPdf(Uint8List bytes, String fileName) async {
  final output = await getTemporaryDirectory();
  final filePath = "${output.path}/$fileName";
  final file = File(filePath);
  await file.writeAsBytes(bytes);
  await OpenFilex.open(filePath);
}
