import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../../dashboard/controllers/dashboard_controller.dart';
import '../controllers/safereach_controller.dart';

class SafeReachView extends StatefulWidget {
  const SafeReachView({super.key});

  @override
  State<SafeReachView> createState() => _SafeReachViewState();
}

class _SafeReachViewState extends State<SafeReachView> {
  final _ctrl = Get.find<SafeReachController>();
  final _latCtrl = TextEditingController();
  final _lngCtrl = TextEditingController();
  final _labelCtrl = TextEditingController();
  double _radius = 200;
  String _tripType = 'evening';

  String get _studentId {
    if (Get.isRegistered<DashboardController>()) {
      return Get.find<DashboardController>().student.value?.id ?? '';
    }
    return '';
  }

  String get _academicYearId => '';

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  @override
  void dispose() {
    _latCtrl.dispose();
    _lngCtrl.dispose();
    _labelCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    final sid = _studentId;
    if (sid.isEmpty) return;
    await Future.wait([
      _ctrl.loadConsent(sid, _academicYearId),
      _ctrl.loadTodayStatus(sid, _academicYearId),
      _ctrl.loadHistory(sid),
    ]);
    final home = _ctrl.consentData['homeAddress'];
    if (home is Map) {
      _latCtrl.text = (home['lat'] ?? '').toString();
      _lngCtrl.text = (home['lng'] ?? '').toString();
      _labelCtrl.text = (home['label'] ?? '').toString();
    }
    if (_ctrl.consentData['homeRadiusMeters'] != null) {
      setState(() {
        _radius = (_ctrl.consentData['homeRadiusMeters'] as num).toDouble();
      });
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'active':
        return Colors.blue;
      case 'arrived':
        return Colors.green;
      case 'delayed':
        return Colors.red;
      default:
        return AppColors.inkLight;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.shield_outlined, size: 22),
            SizedBox(width: 8),
            Text('SafeReach'),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadAll,
        child: Obx(() {
          final status = _ctrl.tripStatus.value;
          final color = _statusColor(status);
          final trip = _ctrl.currentTrip.value;

          return ListView(
            padding: const EdgeInsets.all(Space.lg),
            children: [
              // Status Card
              SurfaceCard(
                child: Column(
                  children: [
                    Container(
                      width: 68,
                      height: 68,
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        status == 'arrived'
                            ? Icons.check_circle_outline
                            : status == 'delayed'
                                ? Icons.warning_amber_rounded
                                : status == 'active'
                                    ? Icons.directions_bus_rounded
                                    : Icons.shield_outlined,
                        color: color,
                        size: 36,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      status == 'active'
                          ? 'Trip in Progress'
                          : status == 'arrived'
                              ? 'Arrived Home Safely'
                              : status == 'delayed'
                                  ? 'Delayed Arrival Alert'
                                  : 'No Active Trip',
                      style: AppTextStyles.h3,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      status == 'active'
                          ? (_ctrl.isTracking.value
                              ? 'Live GPS tracking active'
                              : 'Waiting for location updates')
                          : status == 'arrived' && trip?.endTime != null
                              ? 'Confirmed at ${trip!.endTime!.hour.toString().padLeft(2, '0')}:${trip.endTime!.minute.toString().padLeft(2, '0')}'
                              : 'Enable consent below to start trip tracking',
                      style: AppTextStyles.bodySmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    if (status == 'active' && trip != null)
                      ElevatedButton.icon(
                        onPressed: () => _ctrl.confirmArrival(trip.id),
                        icon: const Icon(Icons.home_rounded),
                        label: const Text('Confirm Home Arrival'),
                      )
                    else
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: _tripType,
                              decoration: const InputDecoration(
                                labelText: 'Trip',
                                border: OutlineInputBorder(),
                                isDense: true,
                              ),
                              items: const [
                                DropdownMenuItem(
                                    value: 'morning', child: Text('Morning')),
                                DropdownMenuItem(
                                    value: 'evening', child: Text('Evening')),
                              ],
                              onChanged: (v) =>
                                  setState(() => _tripType = v ?? 'evening'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          ElevatedButton(
                            onPressed: _ctrl.consentGiven.value && _studentId.isNotEmpty
                                ? () => _ctrl.startTrip(
                                    _studentId, _tripType, _academicYearId)
                                : null,
                            child: const Text('Start Trip'),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Consent & Home Geofence
              SurfaceCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Consent & Home Geofence', style: AppTextStyles.h3),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Location Tracking Consent'),
                      subtitle: const Text(
                          'Allow automatic arrival confirmation during trips'),
                      value: _ctrl.consentGiven.value,
                      onChanged: (v) async {
                        if (_studentId.isEmpty) return;
                        await _ctrl.saveConsent(
                          studentId: _studentId,
                          academicYearId: _academicYearId,
                          consentGiven: v,
                          lat: double.tryParse(_latCtrl.text),
                          lng: double.tryParse(_lngCtrl.text),
                          label: _labelCtrl.text.trim(),
                          radiusMeters: _radius.round(),
                        );
                      },
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _labelCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Home Address Label',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _latCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Latitude',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: _lngCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Longitude',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text('Geofence Radius: ${_radius.round()} m',
                        style: AppTextStyles.bodySmall),
                    Slider(
                      value: _radius,
                      min: 50,
                      max: 2000,
                      divisions: 39,
                      onChanged: (v) => setState(() => _radius = v),
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: OutlinedButton(
                        onPressed: _studentId.isEmpty
                            ? null
                            : () => _ctrl.saveConsent(
                                  studentId: _studentId,
                                  academicYearId: _academicYearId,
                                  consentGiven: _ctrl.consentGiven.value,
                                  lat: double.tryParse(_latCtrl.text),
                                  lng: double.tryParse(_lngCtrl.text),
                                  label: _labelCtrl.text.trim(),
                                  radiusMeters: _radius.round(),
                                ),
                        child: const Text('Save Settings'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Trip History
              Text('Recent Trips', style: AppTextStyles.h3),
              const SizedBox(height: 8),
              if (_ctrl.tripHistory.isEmpty)
                const SurfaceCard(child: Text('No trip history yet.'))
              else
                ..._ctrl.tripHistory.take(10).map((t) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: SurfaceCard(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${t.tripType.toUpperCase()} TRIP',
                                  style: AppTextStyles.labelLarge,
                                ),
                                Text(
                                  '${t.date.day}/${t.date.month}/${t.date.year}',
                                  style: AppTextStyles.bodySmall,
                                ),
                              ],
                            ),
                            Chip(label: Text(t.status.toUpperCase())),
                          ],
                        ),
                      ),
                    )),
            ],
          );
        }),
      ),
    );
  }
}
